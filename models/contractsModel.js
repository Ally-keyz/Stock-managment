const mongoose = require("mongoose");

const contractsModelSchema = mongoose.Schema({
    province:{type:String,required:true},
    district:{type:String,required:true},
    operatorName:{type:String,required:true},
    phone:{type:Number,required:true},
    email:{type:String,unique:true ,required:true},
    startingDate:{type:String,required:true},
    endingDate:{type:String,required:true}
});

const ContractModel = mongoose.model("Contracts",contractsModelSchema);

module.exports = ContractModel;