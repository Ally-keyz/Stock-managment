const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const User = require("../models/userModel")

//load environment variables
dotenv.config()

// user registration route
router.post("/register",async(req,res)=>{
    try {
        const { name , email , wareHouse , password} = req.body;
        if(!name || !email || !wareHouse || !password){
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
        const token = jwt.sign({id:existingUser._id,email:existingUser.email},process.env.JWT_KEY,{expiresIn:"1h"})
        if(!token){
            return res.status(400).json({error:"token not received"})
        }
        res.status(200).json({message:"logged in",token})
    } catch (error) {
        res.status(500).json({error:error.message})
    }
})

module.exports = router;