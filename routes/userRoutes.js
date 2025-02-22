const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const User = require("../models/userModel")
const authMiddleware = require("../middlewares/AuthMiddleware")
const adminMiddleware = require("../middlewares/adminAuthMiddleware");

//load environment variables
dotenv.config()

// user registration route
router.post("/register",adminMiddleware,async(req,res)=>{
    try {
        const { name , email , wareHouse ,position, password} = req.body;
        if(!name || !email || !wareHouse || !position || !password){
            return res.status(400).json({eror:"All fields are required"})
        }
        const existingUser = await User.findOne({email:email});
        if(existingUser){
            return res.status(400).json({error:"user already exists"})
        }
        const hashedPassword = await bcrypt.hash(password,10)
        const newUser = new User({
            name,
            email,
            wareHouse,
            position,
            password:hashedPassword
        })

        const savedUser = await newUser.save()
        res.status(201).json({message:"user created",savedUser})
    } catch (error) {
        res.status(500).json({error:error.message})
    }
})

// login route 

router.post("/login",async(req,res)=>{
    try {
        const { email , password} = req.body;
        //validation
        if(!email || !password){
            return res.status(400).json({error:"All fields are required"})
        }
        const existingUser = await User.findOne({email:email})
        if(!existingUser){
            return res.status(400).json("User does not exist")
        }
        const isMatch = await bcrypt.compare(password,existingUser.password);
        if(!isMatch){
            return res.status(401).json({error:"password is invalid"})
        }
        const token = jwt.sign({id:existingUser._id,email:existingUser.email},process.env.JWT_KEY,{expiresIn:"4h"});
        if(!token){
            return res.status(400).json({error:"token not received"})
        }
        res.status(200).json({message:"logged in",token,user:existingUser})
    } catch (error) {
        res.status(500).json({error:error.message})
    }
});

// route to update users

router.put("/update/:id", adminMiddleware, async (req, res) => {
    try {
      const user = req.body;
      if (!user || Object.keys(user).length === 0) { // Ensure `user` has fields
        return res.status(400).json({ error: "Fields to update are required" });
      }
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true } // Use `runValidators` to enforce schema validation
      );
      if (!updatedUser) { // Handle case where user is not found
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({
        message: "User updated successfully",
        updatedUser,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

// route to delete users
router.delete("/delete/:id", adminMiddleware, async (req, res) => {
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      if (!deletedUser) { // Handle case where user is not found
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;