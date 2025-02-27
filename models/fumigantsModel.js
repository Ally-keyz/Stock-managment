const mongoose = require("mongoose");


const FumigantsModelSchema = mongoose.Schema({
    dateEntry:{type:String,required:true},
    quantity:{type:Number,required:true},
    name:{type:String,required:true},
    remainingFumigants:{type:Number,required:true},
    user: { type: mongoose.Types.ObjectId, ref: "User", required: true }
});

const FumigantsModel = mongoose.model("Fumigants",FumigantsModelSchema);

module.exports = FumigantsModel;