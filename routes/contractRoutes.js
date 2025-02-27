const express = require("express");
const router = express.Router();
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const adminMiddleware = require("../middlewares/adminAuthMiddleware"); // Ensure this is correct
const Contract = require("../models/contractsModel");

// Route to add a contract (only admins are allowed)
router.post("/", async (req, res) => {
    try {
        const {
            province,
            district,
            operatorName,
            phone,
            email,
            startingDate,
            endingDate
        } = req.body;

        // Check if all fields are provided
        if (!province || !district || !operatorName || !phone || !email || !startingDate || !endingDate) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const newContract = new Contract({
            province,
            district,
            operatorName,
            phone,
            email,
            startingDate,
            endingDate
        });

        const savedContract = await newContract.save();
        if (!savedContract) {
            return res.status(500).json({ error: "Failed to create contract" });
        }
        
        return res.status(201).json({ message: "Contract created", savedContract });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Route to view all contracts
router.get("/", adminMiddleware, async (req, res) => {
    try {
        const contracts = await Contract.find();
        return res.status(200).json({ contracts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Route to delete a contract by ID
router.delete("/:id", adminAuthMiddleware, async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: "Please provide an ID!" });
        }

        const deletedContract = await Contract.findByIdAndDelete(id);
        if (!deletedContract) {
            return res.status(404).json({ error: "Contract not found" });
        }

        return res.status(200).json({ message: "Contract deleted successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Route to update a contract by ID
router.put("/:id", adminAuthMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;

        if (!id || !body) {
            return res.status(400).json({ error: "Provide all the required fields" });
        }

        const updatedContract = await Contract.findByIdAndUpdate(
            id,
            body,
            { new: true, runValidators: true }
        );

        if (!updatedContract) {
            return res.status(404).json({ error: "Contract not found" });
        }

        return res.status(200).json({ message: "Contract updated", updatedContract });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
