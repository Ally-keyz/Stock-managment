const express = require("express");
const router = express.Router();
const Messages = require("../models/messagesModel");
const authMiddleware = require("../middlewares/AuthMiddleware");
const Users = require("../models/userModel");

//route to send messages
router.post("/",authMiddleware,async(req,res)=>{
    try {
        const{ text , recipient } = req.body;
        const sender = req.user;
        if(!text || !recipient){
            return res.status(400).json({error:"All fields are required"});
        }

        //find the user name in the database
        const user = await Users.findOne({_id:sender});
        const userName = user.name;

        //find the specific details for the reciver

        const reciever = await Users.findOne({name:recipient});
        const recieverName = reciever.name;
        const newMessage = new Messages({
            text:text,
            sender:userName,
            senderId:sender,
            recipient:recieverName
        });
        const savedMessage = await newMessage.save();
        if(!savedMessage){
            return res.status(404).json({error:"Can to find the message"})
        }
        return res.status(200).json({message:"Message sent successfully"})
    } catch (error) {
        return res.status(500).json({error:`Internal server error ${error.message}`});
    }
});

//view all messages that belongs to the user
router.get("/",authMiddleware,async(req,res)=>{
    try {
        const id = req.user;
        if(!id){
            return res.status(400).json({error:"Please provide an id please"});
        }
        const messages = await Messages.find({senderId:id});
        if(!messages){
            return res.status(404).json({error:"No messages found"});
        }
        return res.status(200).json({messages:messages});
    } catch (error) {
        return res.status(500).json({erro:`Internal server error ${error.message}`});
    }
});

module.exports = router;