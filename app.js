// Importing modules
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const stockRoutes = require("./routes/stockRoutes");
const cors = require("cors"); // Importing cors

// Load environment variables
dotenv.config();

// Use middlewares
app.use(cors()); // Enable CORS for all origins
app.use(express.json());
app.use("/users", userRoutes);
app.use("/stock", stockRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((e) => console.log(`Failed to connect, error: ${e}`));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

module.exports = app;
