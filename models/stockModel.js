const mongoose = require("mongoose");

const stockSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        product: { type: String, required: true },
        quantity: { type: Number, required: true },
        entryDate: { type: Date, required: true },
        fumugationDate: { type: Date },
        fumugated: { type: Boolean, required: true },
        user: { type: mongoose.Types.ObjectId, ref: "User", required: true } // Reference to User
    },
    { timestamps: true }
);

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
