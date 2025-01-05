const express = require("express");
const router = express.Router();
const Stock = require("../models/stockModel");
const authMiddleware = require("../middlewares/AuthMiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Set upload destination
const ExcelJS = require("exceljs");
const inGoing = require("../models/inGoingModel");
const outGoing = require("../models/outGoingModel");


// Add a new product entry or dispatch
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
            dispatched
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

        // Fetch the incrementId for this operation
        const counter = await Counter.findOneAndUpdate(
            { _id: 'stock' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const lastStock = await Stock.findOne({ 
            product, 
            user: req.user.id 
        }).sort({ incrementId: -1 });

        let lastBalance = lastStock ? Number(lastStock.balance) : 0;
        let entryValue = Number(entry) || 0;  // Ensure entry is a number
        let dispatchedValue = Number(dispatched) || 0;  // Ensure dispatched is a number

        const inGoingStock = new inGoing({
            date: entryDate || new Date(),
            plaque: truck || "Unknown",
            wb: wBill || "Unknown",
            destination: originDestination || "Unknown",
            entry: product,
            unitPrice: unitPrice || 0,
            value: entryValue,
            solde: lastBalance + entryValue,
            fumugated: false,
            user: req.user.id
        });

        const outGoingStock = new outGoing({
            date: entryDate || new Date(),
            plaque: truck || "Unknown",
            wb: wBill || "Unknown",
            destination: originDestination || "Unknown",
            exit: product,
            unitPrice: unitPrice || 0,
            value: dispatchedValue,
            solde: lastBalance - dispatchedValue,
            fumugated: false,
            user: req.user.id
        });

        const newStock = new Stock({
            name: req.user.wareHouse || "Unknown", // Assign user's warehouse name
            product: product || "Unknown", // No product field in the file; use default
            entryDate: entryDate || new Date(), // Default to current date if not provided
            truck: truck || "Unknown",
            wBill: wBill || "Unknown",
            originDestination: originDestination || "Unknown",
            entry: entryValue, // 0 if not an entry operation
            dispatched: dispatchedValue, // 0 if not a dispatch operation
            balance: lastBalance + entryValue - dispatchedValue, // Calculate balance
            fumugated: false, // Default fumigated status
            user: req.user.id, // Associate with the logged-in user
            incrementId: counter.seq // Increment ID from the counter
        });

        // Save inGoing and outGoing entries if applicable
        if (entryValue > 0) await inGoingStock.save();
        if (dispatchedValue > 0) await outGoingStock.save();

        // Save the new stock record
        await newStock.save();

        res.status(201).json({ 
            message: "Stock operation recorded successfully.", 
            data: newStock 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// pagination fetching of the current stock
router.get("/myStock",authMiddleware, async (req, res) => {
    try {
        const { page, limits = 10 } = req.query;

        if (!page) {
            return res.status(400).json({ error: "Page is required" });
        }

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limits, 10);

        // Assuming user ID is retrieved from middleware
        const userId = req.user.id;

        // Fetch stocks belonging to the logged-in user
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

// delete stock
router.delete("/delete/:id", authMiddleware, async (req, res) => {
    try {
        const stockId = req.params.id;

        // Find and delete the stock, ensuring it belongs to the logged-in user
        const stock = await Stock.findOneAndDelete({ _id: stockId, user: req.user.id });

        if (!stock) {
            return res.status(404).json({ error: "Stock not found or unauthorized" });
        }

        res.status(200).json({ message: "Stock deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const Counter = require("../models/counterModel");  // Assuming the Counter model is in this path

router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        const user = req.user;

        if (!file) {
            return res.status(400).json({ error: "File upload required" });
        }

        if (!user.wareHouse) {
            return res.status(400).json({ error: "User warehouse is not defined" });
        }

        // Load Excel file
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(file.path);

        const worksheet = workbook.worksheets[0]; // Assume the first sheet is used
        const stockData = [];

        worksheet.eachRow((row, rowNumber) => {
            // Skip the header rows
            if (rowNumber <= 2) return;

            const [
                entryDate,
                truck,
                wBill,
                originDestination,
                entry,
                dispatched,
                balance,
                product,
                fumugated
            ] = row.values.slice(1); // Skip the first index (ExcelJS index starts from 1)

            // Validate and transform data
            stockData.push({
                name: user.wareHouse || "Unknown",
                product: product || "Unknown",
                entryDate: entryDate || new Date().toISOString(),
                truck: truck || "Unknown",
                wBill: wBill || "Unknown",
                originDestination: originDestination || "Unknown",
                entry: entry || 0,
                dispatched: dispatched || 0,
                balance: balance !== null && balance !== undefined ? balance : 0, // Explicit check for balance
                fumugated: fumugated || false,
                user: req.user.id
            });
        });

        if (stockData.length === 0) {
            return res.status(400).json({ error: "No valid data found in the Excel file" });
        }

        // Fetch and update the incrementId for each record
        const counter = await Counter.findOneAndUpdate(
            { _id: 'stock' },
            { $inc: { seq: stockData.length } },
            { new: true, upsert: true }
        );

        // Assign incrementId to each record
        stockData.forEach((record, index) => {
            record.incrementId = counter.seq - stockData.length + index + 1;
        });

        // Save stock data to the database in bulk
        await Stock.insertMany(stockData);

        res.status(201).json({
            message: "Stock data uploaded and processed successfully",
            data: stockData
        });
    } catch (error) {
        console.error("Error processing upload:", error); // Log error details
        res.status(500).json({ error: "An error occurred while processing the file" });
    }
});

//update stock
router.put("/update/:id", authMiddleware, async (req, res) => {
    try {
        const stockId = req.params.id;
        const updates = req.body;

        // Update the stock, ensuring it belongs to the logged-in user
        const updatedStock = await Stock.findOneAndUpdate(
            { _id: stockId, user: req.user.id },
            updates,
            { new: true } // Return the updated document
        );

        if (!updatedStock) {
            return res.status(404).json({ error: "Stock not found or unauthorized" });
        }

        res.status(200).json({ message: "Stock updated successfully", stock: updatedStock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



// Download the current stock report
router.get("/download", authMiddleware, async (req, res) => {
    try {
        // Fetch stocks for the logged-in user
        const stocks = await Stock.find({ user: req.user.id });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Stocks");

        // Add header row
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

        // Add rows
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
                    fumugated: stock.fumugated ? "No" : "Yes"
                });
            });
        } else {
            worksheet.addRow(["No stock data available."]);
        }

        // Set response headers
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=stocks_report.xlsx"
        );
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        // Send the workbook to the client
        await workbook.xlsx.write(res);
        res.end(); // Ensure the response ends properly
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



module.exports = router