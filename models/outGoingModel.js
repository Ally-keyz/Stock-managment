const mongoose = require("mongoose");

const outGoingSchema = mongoose.Schema(
    {
        date: { type: Date, required: true },
        plaque: { type: String, required: true },
        wb: { type: String, required: true },
        destination: { type: String, required: true },
        exit: { type: String, required: true },
        unitPrice: { type: Number, required: true }, // Changed to Number
        value: { type: Number, required: true }, // Changed to Number
        solde: { type: Number, required: true } // Changed to Number
    },
    { timestamps: true } // Add timestamps
);

const OutGoing = mongoose.model("OutGoing", outGoingSchema);

module.exports = OutGoing;
