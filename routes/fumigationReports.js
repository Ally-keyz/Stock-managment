const express = require("express");
const router = express.Router();
const Fumigation = require("../models/fumigationModel");
const adminMiddleware = require("../middlewares/adminAuthMiddleware");
const userAuth = require("../middlewares/AuthMiddleware");
const exceljs = require("exceljs");

// 📌 Route to get all fumigation reports
router.get("/fumigation-reports", userAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(400).json({ error: "User not specified" });
        }
        // Use find() to return an array of reports
        const fumigationReports = await Fumigation.find({ user: user }).sort({ date: -1 });

        if (fumigationReports.length === 0) {
            return res.status(404).json({ error: "No fumigation records found" });
        }
        return res.status(200).json({ reports: fumigationReports });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// 📌 Route to download fumigation reports (filtered by month & year)
router.get("/download-fumigation-report", userAuth, async (req, res) => {
    try {
       
        const user = req.user;
        if (!user) {
            return res.status(400).json({ error: "User not specified" });
        }
        

        const reports = await Fumigation.find({
            user: user,
        }).sort({ date: -1 });

        if (reports.length === 0) {
            return res.status(404).json({ error: "No fumigation records found for this period" });
        }

        // Generate Excel File
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Fumigation Report");

        worksheet.columns = [
            { header: "Date", key: "date", width: 15 },
            { header: "Quantity Fumigated", key: "quantityFumugated", width: 20 },
            { header: "Fumigant Name", key: "name", width: 20 },
            { header: "Quantity of Fumigants Used", key: "quantityOfFumigants", width: 25 },
            { header: "Product ID", key: "product", width: 20 },
        ];

        reports.forEach((record) => {
            worksheet.addRow({
                date: record.date,
                quantityFumugated: record.quantityFumugated,
                name: record.name,
                quantityOfFumigants: record.quantityOfFumigants,
                product: record.product,
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=fumigation_report.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// 📌 Route to get all the fumigation reports for a specific user
router.get("/view", adminMiddleware, async (req, res) => {
    try {
       // Use req.query for GET requests rather than req.body
       const user = req.query.user;
       if (!user) {
           return res.status(400).json({ error: "Please provide a user identifier" });
       }
       const reports = await Fumigation.find({ user: user });
       if (!reports || reports.length === 0) {
           return res.status(404).json({ error: "No fumigation records found for the specified user" });
       }
       return res.status(200).json({ reports: reports });
    } catch (error) {
        return res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
});

// 📌 Route to download fumigation reports (filtered by month & year)
router.get("/download-fumigation-admin", adminMiddleware, async (req, res) => {
    try {
        const { month, year } = req.query;
        const user = req.query.user;
        if (!user) {
            return res.status(400).json({ error: "User not specified" });
        }
        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required" });
        }

        // Convert month to a number (if needed)
        const monthNum = parseInt(month, 10);
        const startDate = new Date(`${year}-${monthNum}-01`);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59); // Last day of the month

        const reports = await Fumigation.find({
            user: user,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: -1 });

        if (reports.length === 0) {
            return res.status(404).json({ error: "No fumigation records found for this period" });
        }

        // Generate Excel File
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet("Fumigation Report");

        worksheet.columns = [
            { header: "Date", key: "date", width: 15 },
            { header: "Quantity Fumigated", key: "quantityFumugated", width: 20 },
            { header: "Fumigant Name", key: "name", width: 20 },
            { header: "Quantity of Fumigants Used", key: "quantityOfFumigants", width: 25 },
            { header: "Product ID", key: "product", width: 20 },
        ];

        reports.forEach((record) => {
            worksheet.addRow({
                date: record.date.toISOString().split("T")[0],
                quantityFumugated: record.quantityFumugated,
                name: record.name,
                quantityOfFumigants: record.quantityOfFumigants,
                product: record.product,
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=fumigation_report_${month}_${year}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
