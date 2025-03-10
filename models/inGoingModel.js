const mongoose = require("mongoose");

const inGoingSchema = mongoose.Schema(
    {
        date: { type: Date, required: true },
        plaque: { type: String, required: true },
        wb: { type: String, required: true },
        destination: { type: String, required: true },
        entry: { type: String, required: true },
        unitPrice: { type: Number, required: true }, 
        value: { type: Number, required: true },
        balance: { type: Number, required: true } , 
        solde: { type: Number, required: true } ,
        contract:{type:String,required:true},
        fumugated: { type: Boolean, required: true },
        user: { type: mongoose.Types.ObjectId, ref: "User", required: true }
    },
    { timestamps: true } // Add timestamps
);

const InGoing = mongoose.model("InGoing", inGoingSchema);

module.exports = InGoing;
