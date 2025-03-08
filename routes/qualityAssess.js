// Importation of modules
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middlewares/AuthMiddleware");
const qualityModel = require("../models/qualityAssessmentModel");
const Products = require("../models/inGoingModel"); // Your product model
const ExcelJS = require("exceljs");

// Route to fetch the quality assessments (for reference)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(400).json({ error: "Failed to find the user" });
    }
    const data = await qualityModel.find({ user: user });
    return res.status(200).json({ data: data });
  } catch (error) {
    return res.status(500).json({
      error: `There is internal server error ${error.message}`,
    });
  }
});

// Route to fetch a single product by ID
router.get("/products/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid product ID format" });
    }

    const product = await Products.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.status(200).json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Route to download the Excel report
// Columns: Product, Date of Quality Assessment, Test Weight, Grade, MC, Harm
router.get("/download-excel", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Fetch all quality assessments for the user
    const qualities = await qualityModel.find({ user: user });
    if (!qualities.length) {
      return res.status(404).json({ message: "No data available" });
    }

    // Extract all unique product IDs from the quality assessments
    const productIds = qualities
      .map((q) => q.product)
      .filter((id) => id != null);

    // Fetch all products in one query from the Product model
    const products = await Products.find({ _id: { $in: productIds } });

    // Create a lookup dictionary for product details keyed by product id
    const productLookup = {};
    products.forEach((prod) => {
      productLookup[prod._id.toString()] = prod;
    });

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Quality Report");

    // Define columns in the desired order:
    // Product, Date of Quality Assessment, Test Weight, Grade, MC, Harm
    worksheet.columns = [
      { header: "Product", key: "product", width: 25 },
      { header: "Date of Quality Assessment", key: "date", width: 20 },
      { header: "Test Weight", key: "testWeight", width: 15 },
      { header: "Grade", key: "grade", width: 15 },
      { header: "MC", key: "MC", width: 15 },
      { header: "Harm", key: "harm", width: 15 },
    ];

    // Style the header row to mimic a professional format (blue background, white bold text)
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF3B82F6" },
      };
      cell.font.color = { argb: "FFFFFFFF" };
    });

    // For each quality assessment, add a row with the required details.
    qualities.forEach((quality) => {
      // Fetch product details using the product id from quality assessment
      const prod = productLookup[quality.product.toString()];
      // Use the 'plaque' field as the product's name (adjust if needed)
      const productName = prod ? prod.plaque : "N/A";
      // Get the quality assessment date from the product model's 'date' field
      const qualityDate = prod ? new Date(prod.date) : null;
      const formattedDate = qualityDate
        ? qualityDate.toLocaleDateString("en-US")
        : "N/A";

      worksheet.addRow({
        product: productName,
        date: formattedDate,
        testWeight: quality.testWeight || "N/A",
        grade: quality.grade || "N/A",
        MC: quality.MC || "N/A",
        harm: quality.harm || "N/A",
      });
    });

    // Set response headers to trigger a download of the Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=quality_report.xlsx"
    );

    // Write the workbook to the response and end the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel file:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
