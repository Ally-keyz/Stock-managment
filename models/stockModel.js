const mongoose = require("mongoose");

const stockSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        product: { type: String, required: true },
        entryDate: { type: String, required: true },
        truck: { type: String,required:true },
        wBill: { type: String,required:true },
        originDestination: { type: String,required:true },
        balance: { type: String,required:true },
        entry: { type: String,required:true },
        dispatched: { type: String,required:true },
        fumugated: { type: Boolean, required: true },
        user: { type: mongoose.Types.ObjectId, ref: "User", required: true } // Reference to User
    },
    { timestamps: true }
);

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;
