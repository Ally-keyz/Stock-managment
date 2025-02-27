const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Set upload destination
const ExcelJS = require("exceljs");

const Stock = require("../models/stockModel");
const inGoing = require("../models/inGoingModel");
const outGoing = require("../models/outGoingModel");
const Contract = require("../models/contractsModel");
const Quality = require("../models/qualityAssessmentModel");
const Counter = require("../models/counterModel"); // Moved to top
const authMiddleware = require("../middlewares/AuthMiddleware");
const exceljs = require("exceljs");

// ----------------------------
// Register a new stock operation with Quality Assessment
// ----------------------------
router.post("/register", authMiddleware, async (req, res) => {
  try {
    const {
      entryDate,
      truck,
      wBill,
      originDestination,
      product,
      entry,
      unitPrice,
      dispatched,
      contract,
      MC,
      harm,
      testWeight,
      grade
    } = req.body;

    // Input validation
    if (!product) {
      return res.status(400).json({ error: "Product name is required." });
    }
    if (!entry && !dispatched) {
      return res.status(400).json({ error: "Specify either entry or dispatched quantity." });
    }
    if (entry && dispatched) {
      return res.status(400).json({ error: "Only one of entry or dispatched can be specified." });
    }

    // Check if the contract exists
    const existingContract = await Contract.findOne({ operatorName: contract });
    console.log(existingContract);
    if (!existingContract) {
      return res.status(400).json({ error: "Specified contract does not exist" });
    }

    // Fetch the incrementId for this operation
    const counter = await Counter.findOneAndUpdate(
      { _id: "stock" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const clearedProduct = product.charAt(0).toUpperCase() + product.slice(1).toLowerCase();

    // Find the last stock entry for balance calculation
    const lastStock = await Stock.findOne({
      product,
      user: req.user.id
    }).sort({ incrementId: -1 });

    let lastBalance = lastStock ? Number(lastStock.balance) : 0;
    let entryValue = Number(entry) || 0;
    let dispatchedValue = Number(dispatched) || 0;

    // Check that the dispatched value does not exceed available balance
    if (dispatchedValue > lastBalance) {
      return res.status(400).json({ error: "Dispatched quantity cannot exceed available stock balance." });
    }

    // Create inGoing and outGoing stock records if applicable
    const inGoingStock = entryValue > 0 ? new inGoing({
      date: entryDate || new Date(),
      plaque: truck || "Unknown",
      wb: wBill || "Unknown",
      destination: originDestination || "Unknown",
      entry: clearedProduct,
      unitPrice: unitPrice || 0,
      value: entryValue,
      balance: lastBalance,
      solde: lastBalance + entryValue,
      contract: existingContract.operatorName || "unknown",
      fumugated: false,
      user: req.user.id
    }) : null;

    const outGoingStock = dispatchedValue > 0 ? new outGoing({
      date: entryDate || new Date(),
      plaque: truck || "Unknown",
      wb: wBill || "Unknown",
      destination: originDestination || "Unknown",
      exit: clearedProduct,
      unitPrice: unitPrice || 0,
      value: dispatchedValue,
      balance: lastBalance,
      solde: lastBalance - dispatchedValue,
      contract: existingContract.operatorName || "unknown",
      fumugated: false,
      user: req.user.id
    }) : null;

    const newStock = new Stock({
      name: req.user.wareHouse || "Unknown",
      product: product || "Unknown",
      entryDate: entryDate || new Date(),
      truck: truck || "Unknown",
      wBill: wBill || "Unknown",
      originDestination: originDestination || "Unknown",
      unitePrice: unitPrice || 0,
      entry: entryValue,
      dispatched: dispatchedValue,
      openingBalance: lastBalance || 0,
      balance: lastBalance + entryValue - dispatchedValue,
      fumugated: true,
      contract: existingContract.operatorName || "unknown",
      user: req.user.id,
      incrementId: counter.seq
    });
        
    // Save inGoing and outGoing entries if applicable
    const entryStock = inGoingStock ? await inGoingStock.save() : null;
    const dispatchedStock = outGoingStock ? await outGoingStock.save() : null;

    // Save the main stock record
    await newStock.save();

    // Save quality assessments based on the operation performed
    if (entryStock) {
      const qualityAssessEntry = new Quality({
        MC: MC || 0,
        harm: harm || "Unknown",
        testWeight: testWeight || 0,
        grade: grade || "Unknown",
        product: entryStock._id,
        user: req.user
      });
      await qualityAssessEntry.save();
    }
    if (dispatchedStock) {
      const qualityAssessDispatch = new Quality({
        MC: MC || 0,
        harm: harm || "Unknown",
        testWeight: testWeight || 0,
        grade: grade || "Unknown",
        product: dispatchedStock._id,
        user: req.user
      });
      await qualityAssessDispatch.save();
    }

    res.status(201).json({
      message: "Stock operation recorded successfully.",
      data: newStock
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//-----------------------------
// Route to calculate the total stock position 
router.get("/position", authMiddleware, async (req, res) => {
  try {
      const user = req.user;
      if (!user) {
          return res.status(400).json({ error: "User cannot be found" });
      }

      // Aggregate total stock entries
      const totalPosition = await Stock.aggregate([
          { $match: { user: user._id } },
          { 
              $group: {
                  _id: null,
                  totalBalance: { $sum: { $toDouble: "$entry" } } // Ensure entry is treated as a number
              }
          }
      ]);

      // Aggregate total stock dispatched
      const totalDispatched = await Stock.aggregate([
          { $match: { user: user._id } },
          { 
              $group: {
                  _id: null,
                  totalBalance: { $sum: { $toDouble: "$dispatched" } } // Ensure dispatched is treated as a number
              }
          }
      ]);

      // Extract values safely
      const valueDispatched = totalDispatched.length ? totalDispatched[0].totalBalance : 0;
      const total = totalPosition.length ? totalPosition[0].totalBalance : 0;

      // Calculate remaining stock
      const calculation = total - valueDispatched;

      // Send response
      res.status(200).json({ 
          totalBalance: calculation, 
          totalEntry: total, 
          totalDispatched: valueDispatched 
      });

  } catch (error) {
      console.error("Error calculating total balance:", error);
      res.status(500).json({ error: error.message });
  }
});



// Route to download the current stock position
router.get("/download-stock-position", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(400).json({ error: "User cannot be found" });
    }

    // Aggregate total stock entries
    const totalPosition = await Stock.aggregate([
      { $match: { user: user._id } },
      { 
        $group: {
          _id: null,
          totalEntry: { $sum: { $toDouble: "$entry" } }
        }
      }
    ]);

    // Aggregate total stock dispatched
    const totalDispatched = await Stock.aggregate([
      { $match: { user: user._id } },
      { 
        $group: {
          _id: null,
          totalDispatched: { $sum: { $toDouble: "$dispatched" } }
        }
      }
    ]);

    // Extract values safely
    const totalEntry = totalPosition.length ? totalPosition[0].totalEntry : 0;
    const dispatchedValue = totalDispatched.length ? totalDispatched[0].totalDispatched : 0;
    const remainingStock = totalEntry - dispatchedValue;

    // Create Excel workbook and worksheet
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Stock Position");

    worksheet.columns = [
      { header: "Total Entry", key: "totalEntry", width: 20 },
      { header: "Total Dispatched", key: "totalDispatched", width: 20 },
      { header: "Remaining Stock", key: "remainingStock", width: 20 }
    ];

    // Add a row with the calculated values
    worksheet.addRow({
      totalEntry: totalEntry,
      totalDispatched: dispatchedValue,
      remainingStock: remainingStock
    });

    // Set response headers and send the Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=current_stock_position.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error downloading stock position:", error);
    res.status(500).json({ error: error.message });
  }
});



// ----------------------------
// Pagination: Get current stock for the logged-in user
// ----------------------------
router.get("/myStock", authMiddleware, async (req, res) => {
    try {
        const { page, limits = 10 } = req.query;
        if (!page) {
            return res.status(400).json({ error: "Page is required" });
        }
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limits, 10);
        const userId = req.user.id;

        const stocks = await Stock.find({ user: userId })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);
        const totalCount = await Stock.countDocuments({ user: userId });

        res.status(200).json({
            stocks,
            totalPages: Math.ceil(totalCount / limitNumber),
            currentPage: pageNumber
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----------------------------
// Delete a stock record (ensuring ownership)
// ----------------------------
router.delete("/delete/:id", authMiddleware, async (req, res) => {
    try {
        const stockId = req.params.id;
        const stock = await Stock.findOneAndDelete({ _id: stockId, user: req.user.id });
        if (!stock) {
            return res.status(404).json({ error: "Stock not found or unauthorized" });
        }
        res.status(200).json({ message: "Stock deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----------------------------
// Upload stock data via Excel file
// ----------------------------
router.post("/upload", authMiddleware, upload.single("file"), async(req, res) => {
    try {
        const file = req.file;
        const user = req.user;
        if (!file) {
            return res.status(400).json({ error: "File upload required" });
        }
        if (!user.wareHouse) {
            return res.status(400).json({ error: "User warehouse is not defined" });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(file.path);
        const worksheet = workbook.worksheets[0]; // Use the first sheet
        const stockData = [];

        worksheet.eachRow(async(row, rowNumber) => {
            if (rowNumber <= 2) return; // Skip headers
            const [
                entryDate,
                truck,
                wBill,
                originDestination,
                unitPrice,
                entry,
                dispatched,
                openingBalance,
                ClosingBalance,
                product,
                fumugated,
                contract
            ] = row.values.slice(1); // Adjust for ExcelJS indexing

            // handle contract validation
            const contractValidation = await Contract.findOne({operatorName:contract});

            if(!contractValidation){
                return res.status(400).json({error:"The specified contract is not found "});
            }

            stockData.push({
                name: user.wareHouse || "Unknown",
                product: product || "Unknown",
                entryDate: entryDate || new Date().toISOString(),
                truck: truck || "Unknown",
                wBill: wBill || "Unknown",
                originDestination: originDestination || "Unknown",
                unitPrice: unitPrice || 0,
                entry: entry || 0,
                dispatched: dispatched || 0,
                openingBalance: openingBalance || 0,
                balance: ClosingBalance !== null && ClosingBalance !== undefined ? ClosingBalance : 0,
                fumugated: fumugated || true,
                harm: harm || "Unknown",
                contract: contractValidation.operatorName || "undefined",
                user: req.user.id
            });
        });

        if (stockData.length === 0) {
            return res.status(400).json({ error: "No valid data found in the Excel file" });
        }

        const counter = await Counter.findOneAndUpdate(
            { _id: 'stock' },
            { $inc: { seq: stockData.length } },
            { new: true, upsert: true }
        );

        stockData.forEach((record, index) => {
            record.incrementId = counter.seq - stockData.length + index + 1;
        });

        await Stock.insertMany(stockData);

        res.status(201).json({
            message: "Stock data uploaded and processed successfully",
            data: stockData
        });
    } catch (error) {
        console.error("Error processing upload:", error);
        res.status(500).json({ error: "An error occurred while processing the file" });
    }
});

// ----------------------------
// Update a stock record
// ----------------------------
router.put("/update/:id", authMiddleware, async (req, res) => {
    try {
        const stockId = req.params.id;
        const updates = req.body;

        const updatedStock = await Stock.findOneAndUpdate(
            { _id: stockId, user: req.user.id },
            updates,
            { new: true }
        );

        if (!updatedStock) {
            return res.status(404).json({ error: "Stock not found or unauthorized" });
        }

        res.status(200).json({ message: "Stock updated successfully", stock: updatedStock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----------------------------
// Download the current stock report as Excel
// ----------------------------
router.get("/download", authMiddleware, async (req, res) => {
    try {
        const stocks = await Stock.find({ user: req.user.id });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Stocks");

        

        worksheet.columns = [
            { header: "Date", key: "entryDate", width: 20 },
            { header: "Truck", key: "truck", width: 15 },
            { header: "Waybill", key: "wBill", width: 20 },
            { header: "Origin/Destination", key: "originDestination", width: 25 },
            { header: "Entry", key: "entry", width: 10 },
            { header: "Dispatched", key: "dispatched", width: 10 },
            { header: "Balance", key: "balance", width: 10 },
            { header: "Fumigated", key: "fumugated", width: 10 }
        ];

        if (stocks.length > 0) {
            stocks.forEach(stock => {
                worksheet.addRow({
                    entryDate: stock.entryDate,
                    truck: stock.truck || "Unknown",
                    wBill: stock.wBill || "Unknown",
                    originDestination: stock.originDestination,
                    entry: stock.entry || 0,
                    dispatched: stock.dispatched || 0,
                    balance: stock.balance || "Unknown",
                    // Adjust label as needed (here "Yes" if fumigated, "No" otherwise)
                    fumugated: stock.fumugated ? "Yes" : "No"
                });
            });
        } else {
            worksheet.addRow(["No stock data available."]);
        }

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=stocks_report.xlsx"
        );
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----------------------------
// Get Ingoing Stocks for the logged-in user
// ----------------------------
router.get("/inGoing", authMiddleware, async (req, res) => {
    try {
        // Use req.user.id for consistency
        const stock = await inGoing.find({ user: req.user.id });
        if (!stock || stock.length === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        res.status(200).json({ message: "Found", stock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----------------------------
// Get Outgoing Stocks for the logged-in user
// ----------------------------
router.get("/outGoing", authMiddleware, async (req, res) => {
    try {
        const stock = await outGoing.find({ user: req.user.id });
        if (!stock || stock.length === 0) {
            return res.status(404).json({ error: "Not found" });
        }
        res.status(200).json({ message: "Found", stock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// GET /allStockData?warehouse=WarehouseName&type=ingoing|outgoing|full
router.get("/allStockData", async (req, res) => {
    try {
      const { warehouse, type } = req.query;
      if (!warehouse) {
        return res.status(400).json({ error: "Warehouse is required." });
      }
      if (!type || !["ingoing", "outgoing", "full"].includes(type.toLowerCase())) {
        return res.status(400).json({ error: "Type must be ingoing, outgoing, or full." });
      }
      
      let data;
      switch (type.toLowerCase()) {
        case "ingoing":
          // Assuming your inGoing model has a 'name' field for warehouse
          data = await inGoing.find({ name: warehouse });
          break;
        case "outgoing":
          // Assuming your outGoing model has a 'name' field for warehouse
          data = await outGoing.find({ name: warehouse });
          break;
        case "full":
          // Using the Stock model which stores warehouse name in 'name'
          data = await Stock.find({ name: warehouse });
          break;
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: "No stock data found for the given warehouse and type." });
      }
      
      res.status(200).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /downloadStockReport?warehouse=WarehouseName&type=ingoing|outgoing|full&month=MM&year=YYYY
router.get("/downloadStockReport", async (req, res) => {
    try {
      const { warehouse, type, month, year } = req.query;
      
      if (!warehouse) {
        return res.status(400).json({ error: "Warehouse is required." });
      }
      if (!type || !["ingoing", "outgoing", "full"].includes(type.toLowerCase())) {
        return res.status(400).json({ error: "Type must be ingoing, outgoing, or full." });
      }
      if (!month || !year) {
        return res.status(400).json({ error: "Both month and year are required." });
      }
      
      // Convert month (assumed 1-indexed) and year to a date range.
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0, 23, 59, 59);  // Last day of the month
      
      let data;
      let dateFilter = {};
      // For full stock (Stock model) use "entryDate" as the date field; for inGoing/outGoing assume the field is "date".
      if (type.toLowerCase() === "full") {
        dateFilter = { entryDate: { $gte: startDate, $lte: endDate } };
      } else {
        dateFilter = { date: { $gte: startDate, $lte: endDate } };
      }
      
      switch (type.toLowerCase()) {
        case "ingoing":
          data = await inGoing.find({ name: warehouse, ...dateFilter });
          break;
        case "outgoing":
          data = await outGoing.find({ name: warehouse, ...dateFilter });
          break;
        case "full":
          data = await Stock.find({ name: warehouse, ...dateFilter });
          break;
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: "No records found for the specified criteria." });
      }
      
      // Create Excel file using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Stock Report");
      
      // Set columns based on the type.
      if (type.toLowerCase() === "full") {
        worksheet.columns = [
          { header: "Entry Date", key: "entryDate", width: 20 },
          { header: "Truck", key: "truck", width: 15 },
          { header: "Waybill", key: "wBill", width: 20 },
          { header: "Origin/Destination", key: "originDestination", width: 25 },
          { header: "Product", key: "product", width: 15 },
          { header: "Entry", key: "entry", width: 10 },
          { header: "Dispatched", key: "dispatched", width: 10 },
          { header: "Balance", key: "balance", width: 10 },
          { header: "Fumigated", key: "fumugated", width: 10 }
        ];
        data.forEach(record => {
          worksheet.addRow({
            entryDate: record.entryDate ? record.entryDate.toISOString().split("T")[0] : "",
            truck: record.truck || "Unknown",
            wBill: record.wBill || "Unknown",
            originDestination: record.originDestination || "Unknown",
            product: record.product || "Unknown",
            entry: record.entry || 0,
            dispatched: record.dispatched || 0,
            balance: record.balance || 0,
            fumugated: record.fumugated ? "Yes" : "No"
          });
        });
      } else {
        // For inGoing/outGoing, assume common fields like date, plaque, wb, destination, product, unitPrice, value, balance, solde.
        worksheet.columns = [
          { header: "Date", key: "date", width: 20 },
          { header: "Plaque", key: "plaque", width: 15 },
          { header: "WB", key: "wb", width: 15 },
          { header: "Destination", key: "destination", width: 25 },
          { header: "Product", key: "product", width: 15 },
          { header: "Unit Price", key: "unitPrice", width: 15 },
          { header: "Value", key: "value", width: 10 },
          { header: "Balance", key: "balance", width: 10 },
          { header: "Solde", key: "solde", width: 10 }
        ];
        data.forEach(record => {
          worksheet.addRow({
            date: record.date ? record.date.toISOString().split("T")[0] : "",
            plaque: record.plaque || "Unknown",
            wb: record.wb || "Unknown",
            destination: record.destination || "Unknown",
            product: record.product || "Unknown",
            unitPrice: record.unitPrice || 0,
            value: record.value || 0,
            balance: record.balance || 0,
            solde: record.solde || 0
          });
        });
      }
      
      // Set response headers for file download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}_stock_report_${month}_${year}.xlsx`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;
