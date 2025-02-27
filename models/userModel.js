const mongoose = require("mongoose");

// Define user schema
const userSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true }, // Email should be unique
        position:{type:String,required:true},
        wareHouse: { type: String, required: true },
        password: { type: String, required: true },
        stocks: [{ type: mongoose.Types.ObjectId, ref: "Stock" }], // Changed to an array
        inGoing: [{ type: mongoose.Types.ObjectId, ref: "inGoing" }], // Changed to an array
        outGoing: [{ type: mongoose.Types.ObjectId, ref: "outGoing" }], // Changed to an array
        fumigants:[{type:mongoose.Types.ObjectId,ref:"Fumigants"}],
        fumigation:[{type:mongoose.Types.ObjectId,ref:"Fumigation"}]
    },
    { timestamps: true } // Add timestamps
);


const User = mongoose.model("User", userSchema);

module.exports = User;
