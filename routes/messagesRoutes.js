const express = require("express");
const router = express.Router();
const Messages = require("../models/messagesModel");
const authMiddleware = require("../middlewares/AuthMiddleware");

//route to send messages
router.post("/:id",authMiddleware,async(req,res)=>{
    try {
        const{text , recipient} = req.body;
        const sender = req.params.id;
        if(!text || !recipient){
            return res.status(400).json({error:"All fields are required"});
        }
        const newMessage = new Messages({
            text:text,
            sender:sender,
            recipient:recipient
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
router.get("/:id",authMiddleware,async(req,res)=>{
    try {
        const {id} = req.params.id;
        if(!id){
            return res.status(400).json({error:"Please provide an id please"});
        }
        const messages = await Messages.find({user:id});
        if(!messages){
            return res.status(404).json({error:"No messages found"});
        }
        return res.status(200).json({messages:messages});
    } catch (error) {
        return res.status(500).json({erro:`Internal server error ${error.message}`});
    }
});

module.exports = router;