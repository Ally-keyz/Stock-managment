const mongoose = require("mongoose");

const inGoingSchema = mongoose.Schema(
    {
        date: { type: Date, required: true },
        plaque: { type: String, required: true },
        wb: { type: String, required: true },
        destination: { type: String, required: true },
        dispatched: { type: String, required: true },
        unitPrice: { type: Number, required: true }, // Changed to Number
        value: { type: Number, required: true }, // Changed to Number
        solde: { type: Number, required: true } // Changed to Number
    },
    { timestamps: true } // Add timestamps
);

const InGoing = mongoose.model("InGoing", inGoingSchema);

module.exports = InGoing;
