const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();
const app = express();
app.use(express.json());
app.use(cors());


const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error:", err));

// --- User Model ---
const User = mongoose.model("User", {
  name: String,
  phone: String,
  password: String,
});

// --- Routes ---
app.get("/", (req, res) => {
  res.send("Zentara Backend Running 🚀");
});

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ name, phone, password: hashed });
    await user.save();

    res.json({ message: "Signup successful ✅" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// JWT TOKEN

app.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ error: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      name: user.name,
      phone: user.phone,
    });

  } catch (err) {
    console.log("ME ERROR:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});
app.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});