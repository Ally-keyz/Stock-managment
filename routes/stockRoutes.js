const express = require("express");
const router = express.Router();
const Stock = require("../models/stockModel");
const authMiddleware = require("../middleware/authMiddleware");

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
