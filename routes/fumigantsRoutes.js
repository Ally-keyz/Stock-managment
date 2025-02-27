const express = require("express");
const router = express.Router();
const Fumigants = require("../models/fumigantsModel");
const adminAuthMiddleware = require("../middlewares/adminAuthMiddleware");
const adminMiddleware = require("../middlewares/AuthMiddleware"); // Ensure consistency
const ExcelJS = require("exceljs");
const path = require("path");
const Fumigation = require("../models/fumigationModel");
const InGoing = require("../models/inGoingModel");
const Stock = require("../models/stockModel");
const { error } = require("console");

// Route to add a new fumigant
router.post("/", adminMiddleware, async (req, res) => {
    try {
        const { dateEntry, quantity, name } = req.body;
        const user = req.user;
        if(!user){
            return res.status(400).json({error:"User is not specified"});
        }

        if (!dateEntry || !quantity || !name) {
            return res.status(400).json({ error: "Please provide all required fields" });
        }

        const lastSameFumigant = await Fumigants.findOne({ name: name });

        if (!lastSameFumigant) {
            // Create a new fumigant entry
            const newFumigant = new Fumigants({
                dateEntry,
                quantity,
                name,
                remainingFumigants: quantity, // Set remaining to the initial quantity
                user:user
            });

            const savedFumigant = await newFumigant.save();
            if (!savedFumigant) {
                return res.status(500).json({ error: "Failed to save the new fumigant" });
            }

            return res.status(201).json({ message: "Fumigant added to stock", fumigant: savedFumigant });
        }

        // Update existing fumigant's quantity and remainingFumigants
        const updatedFumigant = await Fumigants.findByIdAndUpdate(
            lastSameFumigant._id,
            
                 { quantity: quantity, remainingFumigants: quantity + lastSameFumigant.remainingFumigants }
            ,
            { new: true }
        );

        if (!updatedFumigant) {
            return res.status(404).json({ error: "Failed to update fumigant" });
        }

        return res.status(200).json({ message: "Fumigant updated successfully", fumigant: updatedFumigant });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Route to view all fumigants
router.get("/", adminMiddleware, async (req, res) => {
    try {
        const user = req.user;
        if(!user){
            return res.status(400).json({error:"user is not specified"});
        }
        const fumigants = await Fumigants.find({user:user});
        return res.status(200).json({ fumigants });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Route to delete a fumigant by ID
router.delete("/:id", adminMiddleware, async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ error: "Please provide a valid ID" });
        }

        const deletedFumigant = await Fumigants.findByIdAndDelete(id);

        if (!deletedFumigant) {
            return res.status(404).json({ error: "Fumigant not found" });
        }

        return res.status(200).json({ message: "Fumigant deleted successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Route to update a fumigant by ID
router.put("/:id", adminMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { quantity, name, dateEntry, remainingFumigants } = req.body;

        if (!id || !quantity || !name || !dateEntry || remainingFumigants === undefined) {
            return res.status(400).json({ error: "Provide all required fields" });
        }

        const updatedFumigant = await Fumigants.findByIdAndUpdate(
            id,
            { quantity, name, dateEntry, remainingFumigants },
            { new: true, runValidators: true }
        );

        if (!updatedFumigant) {
            return res.status(404).json({ error: "Fumigant not found" });
        }

        return res.status(200).json({ message: "Fumigant updated successfully", fumigant: updatedFumigant });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});



// Route to download an Excel report of available fumigants
router.get("/download-excel", adminMiddleware, async (req, res) => {
    try {
        const user = req.user;
        const fumigants = await Fumigants.find({user:user});

        if (fumigants.length === 0) {
            return res.status(404).json({ error: "No fumigants available for report" });
        }

        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Fumigants Report");

        // Define the columns in the Excel sheet
        worksheet.columns = [
            { header: "ID", key: "_id", width: 25 },
            { header: "Name", key: "name", width: 20 },
            { header: "Date Entry", key: "dateEntry", width: 15 },
            { header: "Quantity", key: "quantity", width: 10 },
            { header: "Remaining Fumigants", key: "remainingFumigants", width: 18 }
        ];

        // Add fumigants data to worksheet
        fumigants.forEach((fumigant) => {
            worksheet.addRow(fumigant);
        });

        // Set the file path
        const filePath = path.join(__dirname, "../reports", `Fumigants_Report.xlsx`);

        // Save the Excel file
        await workbook.xlsx.writeFile(filePath);

        // Send the file to the client for download
        res.download(filePath, "Fumigants_Report.xlsx", (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error downloading the Excel file" });
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});



// Routes for the fumigation process
router.post("/fumigation/:id", adminMiddleware, async (req, res) => {
    try {
        const { date, quantityFumugated, name, quantityOfFumigants } = req.body;
        const product = req.params.id;
        const user = req.user;

        // Validate required fields
        if (!date || !quantityFumugated || !name || !quantityOfFumigants || !product ||!user) {
            return res.status(400).json({ error: "Please provide all the fields" });
        }
          const remaining = await Fumigants.findOne({name:name});
          if(!remaining){
            return res.status(400).json({message:"Fumigant used is not found"});
          }
          if(quantityOfFumigants > remaining.remainingFumigants){
            return res.status(400).json({error:"Quantity of fumigants used is much than in stock"});
          }
          const newRecord = quantityOfFumigants - remaining.remainingFumigants;
        // Create a new fumigation record
        const newFumigationProcess = new Fumigation({
            date, 
            quantityFumugated, 
            name, 
            quantityOfFumigants, 
            remainingFumigants:newRecord,
            product,
            user:user
        });

        const savedFumigation = await newFumigationProcess.save();
        if (!savedFumigation) {
            return res.status(500).json({ error: "Failed to save fumigation process" });
        }

        // Update fumigation status of the product in stock and in-going stock
        const updateProductInInGoingModel = await InGoing.findByIdAndUpdate(product, { $set: { fumugated: true } }, { new: true });   
        console.log(updateProductInInGoingModel);     

        if (!updateProductInInGoingModel && !updateProductinStock) {
            return res.status(404).json({ error: "Product not found in stock or in-going inventory" });
        }

       // Look for fumigant by name and a specific user
       const fumigant = await Fumigants.findOne({
        name:name,
        user:user
       });
        

       if (!fumigant) {
       return res.status(404).json({ error: "Fumigant not found" });
       }

       // Ensure that the remaining quantity doesn't go below zero
      if (fumigant.remainingFumigants < quantityOfFumigants) {
       return res.status(400).json({ error: "Not enough fumigant available" });
       }

       // Update remaining fumigant quantity
      const updateFumigants = await Fumigants.findByIdAndUpdate(
        fumigant._id,
        { $set: { remainingFumigants: fumigant.remainingFumigants - quantityOfFumigants } },
        { new: true }
        );


        if (!updateFumigants) {
            return res.status(500).json({ error: "Failed to update fumigant quantity" });
        }

        return res.status(201).json({ message: "Fumigation process successful" });

       } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
       }
     });


module.exports = router;
