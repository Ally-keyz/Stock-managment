const mongoose = require("mongoose");

const qualityModelSchema = mongoose.Schema({
    product:{type:mongoose.Types.ObjectId,ref:"Stock",required:true},
    
})