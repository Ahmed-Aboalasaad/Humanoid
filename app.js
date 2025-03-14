require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs-extra");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http"); // Import HTTP module
const socketIo = require("socket.io"); // Import Socket.IO
const connectDB = require("./utils/connect");

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = socketIo(server, {
  maxHttpBufferSize: 5e6, // Increase buffer size for larger frames
});
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

// ###################### Server Socket #############################

const FPS = 30; // Frames per second of the original video
const FRAMES_DIR = path.join(__dirname, "./frames");

async function getFramesList() {
  try {
    const files = await fs.readdir(FRAMES_DIR);
    return files
      .filter((file) => file.endsWith(".png"))
      .sort(
        (a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0])
      );
  } catch (err) {
    console.error("Error reading frames directory:", err);
    return [];
  }
}

// Send video info to client
function sendVideoInfo(socket, frames) {
  socket.emit("video-info", {
    totalFrames: frames.length,
    fps: FPS,
  });
}

// Send a single frame to the client
async function sendFrame(socket, frame, index) {
  const timestamp = (index * 1000) / FPS;
  const framePath = path.join(FRAMES_DIR, frame);
  try {
    const frameData = await fs.readFile(framePath);
    const base64Frame = frameData.toString("base64");
    socket.emit("frame", {
      index,
      data: `data:image/png;base64,${base64Frame}`,
      timestamp,
    });
  } catch (err) {
    console.error(`Error sending frame ${index}:`, err);
  }
}

// Stream frames to client
async function streamFrames(socket, frames) {
  for (let i = 0; i < frames.length; i++) {
    await sendFrame(socket, frames[i], i);
    if (i % 10 === 9) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  socket.emit("stream-end");
  console.log("All frames sent to client");
}

io.on("connection", async (socket) => {
  console.log("Client connected");

  const frames = await getFramesList();
  if (frames.length === 0) {
    socket.emit("error", { message: "No frames found" });
    return;
  }

  sendVideoInfo(socket, frames);

  socket.on("ready", async () => {
    await streamFrames(socket, frames);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});
// ###################### Server Socket #############################

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
