const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const Message = require("./models/Message");
const { encrypt } = require("./utils/crypto");
const cloudinary = require("cloudinary").v2;
const uploadRoute = require("./routes/upload");

const app = express();
app.use(express.json());
app.use(cors());
app.use(fileUpload({ useTempFiles: true }));
app.use("/upload", uploadRoute);
// --- ENV ---
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// --- DB ---
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error:", err));

// --- Cloudinary ---
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

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
  } catch {
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

// /me
app.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    res.json({
      name: user.name,
      phone: user.phone,
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});


// --- SERVER ---
const server = http.createServer(app);

// --- SOCKET ---
const io = new Server(server, {
  cors: { origin: "*" },
});

// 🔐 AUTH
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// 🔌 CONNECTION
io.on("connection", (socket) => {
  const userId = socket.user.id;
  console.log("Connected:", userId);

  socket.join(userId);

  // 💬 CHAT
  socket.on("sendMessage", async ({ receiver, message, type }) => {
    const encrypted = encrypt(message);

    const msg = await Message.create({
      sender: userId,
      receiver,
      message: encrypted,
      type,
    });

    io.to(receiver).emit("receiveMessage", msg);
  });

  // 📞 CALL
  socket.on("callUser", ({ to, offer }) => {
    io.to(to).emit("incomingCall", {
      from: userId,
      offer,
    });
  });

  socket.on("answerCall", ({ to, answer }) => {
    io.to(to).emit("callAnswered", { answer });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(to).emit("iceCandidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", userId);
  });
});

// --- START ---
server.listen(5000, () => {
  console.log("Server running on port 5000 🚀");
});