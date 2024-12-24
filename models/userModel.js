const mongoose = require("mongoose");

// define user schema

const userSchema = mongoose.Schema({
    name:{type:String,required:true},
    email:{type:String,required:true},
    wareHouse:{type:String,required:true},
    password:{type:String,required:true},
    Stock:{type:mongoose.Types.ObjectId,ref:"Stock"},
    inGoing:{type:mongoose.Types.ObjectId,ref:"inGoing"},
    outGoing:{type:mongoose.Types.ObjectId,ref:"outGoing"}
})

const user = mongoose.model("users",userSchema);

module.exports = user