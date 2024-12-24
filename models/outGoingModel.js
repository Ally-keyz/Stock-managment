const mongoose = require("mongoose");

const outGoingSchema = mongoose.Schema({
    date:{type:Date,required:true},
    plaque:{type:String,required:true},
    wb:{type:String,required:true},
    destination:{type:String,required:true},
    exit:{type:String,required:true},
    unitPrice:{type:String,required:true},
    value:{type:String,required:true},
    solde:{type:String,required:true}
})

const outGoing = mongoose.model("outGoing",outGoingSchema)

module.exports = outGoing;