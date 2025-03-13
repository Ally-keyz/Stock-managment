const mongoose = require("mongoose");

const messagesModelSchema = new mongoose.Schema({
    text: { type: String, required: true },
    sender: { type: String,  required: true },
    senderId: { type: mongoose.Types.ObjectId,ref:"User",  required: true },  // Fixed sender type
    recipient: { type: String,  required: true },  
    date: { type: Date, default: Date.now }  // Fixed Date type and default function reference
});

const Messages = mongoose.model("Messages", messagesModelSchema);

module.exports = Messages;
