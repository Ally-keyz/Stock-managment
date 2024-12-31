const express = require('express');
const router = express.Router();
const  authMiddleware  = require("../middlewares/AuthMiddleware");
const Stock = require('../models/stockModel'); 
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } = require('docx'); // For Word document creation
const fs = require('fs');
const path = require('path');

// Helper function to parse and filter dates
const parseDate = (dateString) => {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed in JavaScript Date
};

// Monthly Reports API
router.get('/reports/monthly', authMiddleware, async (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required." });
        }

        const startDate = new Date(year, month - 1, 1); // First day of the month
        const endDate = new Date(year, month, 0); // Last day of the month

        const monthlyReport = await Stock.find({ user: req.user.id }).sort({ entryDate: 1 });

        // Filter based on parsed dates
        const filteredReport = monthlyReport.filter((record) => {
            const recordDate = parseDate(record.entryDate);
            return recordDate >= startDate && recordDate <= endDate;
        });

        res.status(200).json({ 
            message: "Monthly report retrieved successfully.",
            data: filteredReport 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Annual Reports API
router.get('/reports/annual', authMiddleware, async (req, res) => {
    try {
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({ error: "Year is required." });
        }

        const startDate = new Date(year, 0, 1); // January 1st
        const endDate = new Date(year, 11, 31); // December 31st

        const annualReport = await Stock.find({ user: req.user.id }).sort({ entryDate: 1 });

        // Filter based on parsed dates
        const filteredReport = annualReport.filter((record) => {
            const recordDate = parseDate(record.entryDate);
            return recordDate >= startDate && recordDate <= endDate;
        });

        res.status(200).json({ 
            message: "Annual report retrieved successfully.",
            data: filteredReport 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//Generation of word document report
// Helper function to generate Word document
const generateWordDocument = async (data, userText, title) => {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Title Paragraph
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: title,
                                bold: true,
                                size: 32,
                            }),
                        ],
                    }),
                    // User Text Paragraph
                    new Paragraph({
                        text: userText,
                        spacing: { after: 400 },
                    }),
                    // Table Header
                    new Table({
                        rows: [
                            // Table Header Row
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ text: "Product", bold: true })],
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: "Entry Date", bold: true })],
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: "Entry", bold: true })],
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: "Dispatched", bold: true })],
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ text: "Balance", bold: true })],
                                    }),
                                ],
                            }),
                            // Table Rows for Data
                            ...data.map(
                                (item) =>
                                    new TableRow({
                                        children: [
                                            new TableCell({
                                                children: [new Paragraph(item.product)],
                                            }),
                                            new TableCell({
                                                children: [new Paragraph(item.entryDate)],
                                            }),
                                            new TableCell({
                                                children: [new Paragraph(item.entry.toString())],
                                            }),
                                            new TableCell({
                                                children: [new Paragraph(item.dispatched.toString())],
                                            }),
                                            new TableCell({
                                                children: [new Paragraph(item.balance.toString())],
                                            }),
                                        ],
                                    })
                            ),
                        ],
                    }),
                ],
            },
        ],
    });

    const filePath = path.join(__dirname, `../downloads/${title.replace(/ /g, '_')}.docx`);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    return filePath;
};


// API for downloading Word Monthly Report
router.get('/reports/monthly/word', authMiddleware, async (req, res) => {
    try {
        const { month, year, userText } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required." });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const monthlyReport = await Stock.find({ user: req.user.id }).sort({ entryDate: 1 });

        const filteredReport = monthlyReport.filter((record) => {
            const recordDate = parseDate(record.entryDate);
            return recordDate >= startDate && recordDate <= endDate;
        });

        if (filteredReport.length === 0) {
            return res.status(404).json({ error: "No data found for the specified period." });
        }

        const filePath = await generateWordDocument(
            filteredReport,
            userText || "This is your custom report.",
            `Monthly Report ${month}/${year}`
        );

        res.download(filePath, () => {
            fs.unlinkSync(filePath); // Cleanup after download
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API for downloading Word Annual Report
router.get('/reports/annual/word', authMiddleware, async (req, res) => {
    try {
        const { year, userText } = req.query;

        if (!year) {
            return res.status(400).json({ error: "Year is required." });
        }

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        const annualReport = await Stock.find({ user: req.user.id }).sort({ entryDate: 1 });

        const filteredReport = annualReport.filter((record) => {
            const recordDate = parseDate(record.entryDate);
            return recordDate >= startDate && recordDate <= endDate;
        });

        if (filteredReport.length === 0) {
            return res.status(404).json({ error: "No data found for the specified year." });
        }

        const filePath = await generateWordDocument(
            filteredReport,
            userText || "This is your custom report.",
            `Annual Report ${year}`
        );

        res.download(filePath, () => {
            fs.unlinkSync(filePath); // Cleanup after download
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/regisre",()=>{

})

module.exports = router;
