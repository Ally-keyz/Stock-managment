const mongoose = require("mongoose")

const inGoingShema = mongoose.Schema({
    date:{type:Date,required:true},
    plaque:{type:String,required:true},
    wb:{type:String,required:true},
    destination:{type:String,required:true},
    dispatched:{type:String,required:true},
    unitPrice:{type:String,required:true},
    value:{type:String,required:true},
    solde:{type:String,required:true}
})

const inGoing = mongoose.model("inGoing",inGoingShema)

module.exports = inGoing;