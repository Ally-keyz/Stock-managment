const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/userModel");

// Configure environment variables
dotenv.config();

// Declare the authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const token = req.header("Authorization").replace("Bearer ", "").trim();
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        } else if (user.position !== "Admin") {
            return res.status(403).json({ error: "Forbidden: Not allowed" });
        }

        req.user = user; // Attach the user to the request
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

module.exports = authenticate;
