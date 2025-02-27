const mongoose = require("mongoose");

const QualityModelSchema = mongoose.Schema({
    MC:{type:Number,required:true},
    harm:{type:String,required:true},
    testWeight:{type:Number,required:true},
    grade:{type:String,required:true},
    product:{type:mongoose.Types.ObjectId,ref:"InGoing",required:true}
});

const QualityModel = mongoose.model("QualityAssessment",QualityModelSchema);

module.exports = QualityModel;
