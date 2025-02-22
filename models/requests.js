const mongoose = require("mongoose");

// Make a schema for the requests
const manPowerSchema = mongoose.Schema({
  number: { required: true, type: Number },
  action: { required: true, type: String },
  approval: { required: true, type: Boolean },
  payment: { required: true, type: Boolean },
  date: { type: String, required: true },
  user: { type: mongoose.Types.ObjectId, ref: "User", required: true }
});

const manPower = mongoose.model("manPower", manPowerSchema);

module.exports = manPower;

