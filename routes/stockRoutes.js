const express = require("express");
const router = express.Router();
const Stock = require("../models/stockModel");
const authMiddleware = require("../middlewares/AuthMiddleware");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // Set upload destination
const ExcelJS = require("exceljs");

// registration of the stock

router.post("/register",authMiddleware, async (req, res) => {
    try {
        const { name, product, quantity, entryDate, fumugationDate, fumugated } = req.body;

        if (!name || !product || !quantity || !entryDate || fumugated === undefined) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Assuming user ID is retrieved from middleware
        const userId = req.user.id;

        const newStock = new Stock({
            name,
            product,
            quantity,
            entryDate,
            fumugationDate,
            fumugated,
            user: userId // Add the user ID to associate the stock
        });

        const saveStock = await newStock.save();

        res.status(201).json({ message: "Stock registered successfully", stock: saveStock });
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

//upload the stock 
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "File upload required" });
        }

        // Process the file here (e.g., parse CSV and save stock data to the database)
        // Example: Use a CSV parser to read the file

        res.status(200).json({ message: "File uploaded successfully", file });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//download the current stock report
router.get("/download", authMiddleware, async (req, res) => {
    try {
        const stocks = await Stock.find({ user: req.user.id });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Stocks");

        // Add header row
        worksheet.columns = [
            { header: "Name", key: "name", width: 20 },
            { header: "Product", key: "product", width: 20 },
            { header: "Quantity", key: "quantity", width: 10 },
            { header: "Entry Date", key: "entryDate", width: 20 },
            { header: "Fumigation Date", key: "fumugationDate", width: 20 },
            { header: "Fumigated", key: "fumugated", width: 10 }
        ];

        // Add rows
        stocks.forEach(stock => {
            worksheet.addRow({
                name: stock.name,
                product: stock.product,
                quantity: stock.quantity,
                entryDate: stock.entryDate,
                fumugationDate: stock.fumugationDate,
                fumugated: stock.fumugated ? "Yes" : "No"
            });
        });

        // Set response headers
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=stocks.xlsx"
        );
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        // Send the workbook
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = router