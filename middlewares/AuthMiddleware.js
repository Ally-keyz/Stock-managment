const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const dotenv = require("dotenv");

//load env variables
dotenv.config()

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header("Authorization").replace("Bearer ", "");
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const user = await User.findById(decoded.id);

        if (!user) {
            throw new Error("User not found");
        }

        req.user = user; // Attach user to request
        next();
    } catch (error) {
        res.status(401).json({ error: "Unauthorized" });
    }
};

module.exports = authMiddleware;
