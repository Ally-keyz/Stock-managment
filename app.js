//importation of mudules
const express = require("express");
const app = express()
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes")


// load environment variables
dotenv.config();

//use of middle wares
app.use(express.json());
app.use("/users",userRoutes);

// connecting to mongo database
mongoose.connect(process.env.MONGO_URL)
.then(()=>console.log("connected to mongo data base"))
.catch((e)=>console.log(`Failed to connect error:${e}`))

const PORT = 5000;
app.listen(PORT,()=>{
  console.log(`Listening on port ${PORT}`);
})

module.exports = app;
