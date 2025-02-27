const mongoose = require("mongoose");

const fumugationModelSchema = mongoose.Schema({
    date:{type:String,required:true},
    quantityFumugated:{type:Number,required:true},
    name:{type:String,required:true},
    quantityOfFumigants:{type:Number,required:true},
    remainingFumigants:{type:Number,required:true},
    product:{type:mongoose.Types.ObjectId,ref:"InGoing",required:true},
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true }
});

const fumigationModel = mongoose.model("Fumigation",fumugationModelSchema);

module.exports = fumigationModel;