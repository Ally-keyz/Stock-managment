const mongoose = require("mongoose");

const stockSchema = mongoose.Schema({
    name:{type:String,required:true},
    product:{type:String,required:true},
    quantity:{type:Number,required:true},
    entryDate:{type:Date,required:true},
    fumugationDate:{type:Date,required:true},
    fumugated:{type:Boolean,required:true}
});

const Stock = mongoose.model("Stock",stockSchema)

module.exports = Stock;