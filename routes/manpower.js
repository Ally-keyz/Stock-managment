const express = require("express");
const router = express.Router();
const ManPower = require("../models/requests.js");
const authanticate = require("../middlewares/AuthMiddleware");
const adminMiddleware = require("../middlewares/adminAuthMiddleware.js");

// Register a new manpower request
// POST /manpower

router.post("/",authanticate, async (req, res) => {
  try {
    const { number, action, date} = req.body;
   //adding some security for handling invalid details
   if(!number || !action || !date ||!req.user){
    return res.status(400).json({error:"All fields are required please!"});
   }
     
    // approval and payment default to false
    const newManPower = new ManPower({
      number,
      action,
      date,
      user:req.user,
      approval: false,
      payment: false,
    });
    const savedManPower = await newManPower.save();
    res.status(201).json(savedManPower);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all manpower requests
// GET /manpower
router.get("/",authanticate,  async (req, res) => {
  try {
    const user = req.user;
    if(!user){
      return res.status(400).json({error:"No user specified"});
    }

    const manPowers = await ManPower.find({user:user});
    res.json(manPowers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//route to get all manpowers for admins
router.get("/all",adminMiddleware,async(req,res)=>{
  try {
    const manPowers = await ManPower.find();
    return res.status(200).json({manPowers:manPowers});
  } catch (error) {
    return res.status(500).json({error:"Internal server error"});
  }
});

// Approve a manpower request by ID (set approval to true)
// PATCH /manpower/:id/approve

router.patch("/:id/approve",adminMiddleware,  async (req, res) => {
  try {
    const { id } = req.params;
    if(!id){
      return res.status(400).json({error:"Please provide an id!"});
    }
    const updatedManPower = await ManPower.findByIdAndUpdate(
      id,
      { approval: true },
      { new: true }
    );
    if (!updatedManPower)
      return res.status(404).json({ error: "Manpower request not found" });
    res.json(updatedManPower);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Request payment for a manpower request by ID (set payment to true)
// PATCH /manpower/:id/payment
router.patch("/:id/payment",adminMiddleware,  async (req, res) => {
  try {
    const { id } = req.params;
    const updatedManPower = await ManPower.findByIdAndUpdate(
      id,
      { payment: true },
      { new: true }
    );
    if (!updatedManPower)
      return res.status(404).json({ error: "Manpower request not found" });
    res.json(updatedManPower);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
