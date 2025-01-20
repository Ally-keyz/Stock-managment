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

// Helper function to ensure directory existence
const ensureDirectoryExistence = (filePath) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Helper function to sanitize file names
const sanitizeFilename = (filename) => filename.replace(/[\/\\?%*:|"<>]/g, '_');

// Helper function to generate Word document
const generateWordDocument = async (data, userName, whareHouse, title) => {
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Ministry Header
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "MINISTRY OF AGRICULTURE AND ANIMAL RESOURCES",
                                bold: true,
                                size: 28,
                                allCaps: true,
                            }),
                        ],
                        alignment: "center",
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "NATIONAL STRATEGIC GRAIN RESERVE (N.S.G.R)",
                                bold: true,
                                size: 24,
                            }),
                        ],
                        alignment: "center",
                        spacing: { after: 400 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "INTERNAL MEMO",
                                bold: true,
                                underline: {},
                                size: 28,
                            }),
                        ],
                        alignment: "center",
                        spacing: { after: 400 },
                    }),

                    // Memo Information
                    new Paragraph({
                        children: [
                            new TextRun({ text: `FROM              : ${userName}`, bold: true }),
                        ],
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `TITLE                : ${whareHouse} Warehouse Storekeeper`, bold: true }),
                        ],
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "TO                  : Acting Coordinator SPIU/MINAGRI", bold: true }),
                        ],
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "RE                  : Monthly Report", bold: true }),
                        ],
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `DATE               : ${new Date().toLocaleDateString()}`, bold: true }),
                        ],
                        spacing: { after: 400 },
                    }),

                    // Memo Content
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Dear Acting Coordinator,\n\nI hereby submit to you the report of activities carried out in ${title} in Nyamagabe warehouse.\n\nYou will find details in the attached document.\n\nThanks.\n\nComments:\n\n`,
                                bold: true,
                            }),
                        ],
                        spacing: { after: 400 },
                    }),

                    // Table Header
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `THE FOLLOWING TABLE SHOWS THE CURRENT BEANS STORE DURING ${title.toUpperCase()}`,
                                bold: true,
                            }),
                        ],
                        alignment: "center",
                        spacing: { after: 400 },
                    }),

                    // Data Table
                    new Table({
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "BEANS", bold: true })] })] }),
                                    new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "PERIOD", bold: true })] })] }),
                                    new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "RECEIVED QUANTITY (KG)", bold: true })] })] }),
                                    new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "DISPATCHED QUANTITY (KG)", bold: true })] })] }),
                                    new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "CLOSED BALANCE (KG)", bold: true })] })] }),
                                ],
                            }),
                            ...data.map(
                                (item) =>
                                    new TableRow({
                                        children: [
                                            new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item.product, bold: true })] })] }),
                                            new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item.entryDate, bold: true })] })] }),
                                            new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item.entry.toString(), bold: true })] })] }),
                                            new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item.dispatched.toString(), bold: true })] })] }),
                                            new TableCell({ width: { size: 10000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item.balance.toString(), bold: true })] })] }),
                                        ],
                                    })
                            ),
                        ],
                    }),

                    // Conclusion
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `CONCLUSION:\n\nIn general, the main activities in ${title} consisted of assuring the safety of stored commodities, which are beans.\n\nAll this assures the safety of stored commodities, which are beans.\n\n`,
                                bold: true,
                            }),
                        ],
                        spacing: { after: 400 },
                    }),

                    // Signature
                    new Paragraph({
                        children: [
                            new TextRun({ text: "AYURUKUNDO Alice", bold: true }),
                        ],
                        alignment: "right",
                        spacing: { before: 400, after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Nyamagabe warehouse/Storekeeper", bold: true }),
                        ],
                        alignment: "right",
                        spacing: { after: 200 },
                    }),
                ],
            },
        ],
    });



    const safeTitle = sanitizeFilename(title);
    const filePath = path.join(__dirname, `../downloads/${safeTitle}.docx`);
    ensureDirectoryExistence(filePath);

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
        const user = req.user

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
            user.name,
            user.wareHouse,
            `${month}-${year}`
        );

        res.download(filePath, (err) => {
            if (err) {
                console.error("Error during file download:", err);
            }
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


module.exports = router;
