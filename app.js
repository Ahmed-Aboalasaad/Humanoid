require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs-extra");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDB = require("./utils/connect");

const app = express();
const PORT = process.env.PORT || 3030;

// Connect to the database
connectDB();

// Middleware
app.use(cors());

app.use(
  cors({
    origin: "*", // ⚠️ Allow all origins (Not recommended for production)
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  })
);

const upload = multer({ dest: "uploads/" }); // Ensure a destination folder
app.use(upload.single("video")); // Expect the file field to be "video"

// Path to store extracted frames and the final video
const FRAMES_FOLDER = path.join(__dirname, "public/streaming", "frames");
const VIDEO_FOLDER = path.join(__dirname, "public/streaming", "videos");
// Ensure directories exist
fs.ensureDirSync(FRAMES_FOLDER);
fs.ensureDirSync(VIDEO_FOLDER);

app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().single("input"));
app.use(express.static(path.join(__dirname, "public")));

// Routes
const userRoute = require("./routes/user");
const chatRoute = require("./routes/chat");
const viewRoute = require("./routes/view");
const streamRoute = require("./routes/streaming");

app.use("/", viewRoute); // Front-end routes
app.use("/humaniod/user", userRoute); // User-related API routes
app.use("/humaniod/chat", chatRoute); // Chat-related API routes
app.use("/humaniod/stream", streamRoute); // Streaming-related API routes

// Error handling for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
