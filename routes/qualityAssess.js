//importation of modules
const express = require("express");
const router = express.Router();
const qualityModel = require("../models/qualityAssessmentModel");
const authMiddleware = require("../middlewares/AuthMiddleware");
const ExcelJS = require("exceljs");

//route to fetch the quality assessment

router.get("/",authMiddleware,async(req,res)=>{
    try {
        //Fetch the data if the user token exists
        const user = req.user;
        if(!user){
            return res.status(400).json({error:"Failed to find the user"});
        }
        const data = await qualityModel.find({user:user});
        return res.status(200).json({data:data});
    } catch (error) {
        return res.status(500).json({error:`There is internal server error ${error.message}`});
        
    }
});

//reports 
router.get("/download-excel",authMiddleware, async (req, res) => {
    try {
        
        const user = req.user;
        if(!user){
            return res.status(400).json({error:"User not found"});
        }
        const qualities = await qualityModel.find({user:user}).populate("product");
        if (!qualities.length) {
            return res.status(404).json({ message: "No data available" });
        }

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Quality Report");

        // Define columns
        worksheet.columns = [
            { header: "MC", key: "MC", width: 15 },
            { header: "Harm", key: "harm", width: 25 },
            { header: "Test Weight", key: "testWeight", width: 20 },
            { header: "Grade", key: "grade", width: 15 },
            { header: "Product ID", key: "product", width: 30 },
        ];

        // Add rows to the worksheet
        qualities.forEach((quality) => {
            worksheet.addRow({
                MC: quality.MC,
                harm: quality.harm,
                testWeight: quality.testWeight,
                grade: quality.grade,
                product: quality.product ? quality.product._id.toString() : "N/A",
            });
        });

        // Set response headers
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=quality_report.xlsx");

        // Write the workbook to the response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating Excel file:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
