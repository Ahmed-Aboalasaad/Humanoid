require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs-extra");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const connectDB = require("./utils/connect");
const chokidar = require("chokidar"); // You'll need to install this: npm install chokidar

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  maxHttpBufferSize: 5e6, // Increase buffer size for larger frames
});
const PORT = process.env.PORT || 3030;

// Connect to the database
connectDB();

// Middleware
app.use(
  cors({
    origin: "*", // ⚠️ Allow all origins (Not recommended for production)
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  })
);

const upload = multer({ dest: "uploads/" });
app.use(upload.single("video"));

// Path to store extracted frames and the final video
const FRAMES_FOLDER = path.join(__dirname, "public/streaming", "frames");
const VIDEO_FOLDER = path.join(__dirname, "public/streaming", "videos");
// Ensure directories exist
fs.ensureDirSync(FRAMES_FOLDER);
fs.ensureDirSync(VIDEO_FOLDER);

// Define frames directory for monitoring
const FRAMES_DIR = path.join(__dirname, "./generator/frames");
fs.ensureDirSync(FRAMES_DIR); // Ensure frames directory exists

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

app.use("/", viewRoute);
app.use("/humaniod/user", userRoute);
app.use("/humaniod/chat", chatRoute);
app.use("/humaniod/stream", streamRoute);

// Error handling for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Initialize frame monitoring
let activeFrameWatchers = new Map(); // Map of chatId -> watcher
const FPS = 30; // Frames per second

// Function to start watching frames directory for a specific chat
function startFrameWatcher(chatId, socket) {
  // Stop any existing watcher for this chat
  stopFrameWatcher(chatId);

  console.log(`Starting frame watcher for chat: ${chatId}`);

  // Create watcher for the frames directory
  const watcher = chokidar.watch(FRAMES_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });

  // Store frames in order
  let frames = [];

  // Watch for new or changed PNG files
  watcher.on("add", (path) => {
    if (path.endsWith(".png")) {
      console.log(`New frame detected: ${path}`);

      // Read the frame and send it to the client
      fs.readFile(path, (err, data) => {
        if (err) {
          console.error(`Error reading frame: ${err}`);
          return;
        }

        const frameIndex = parseInt(path.match(/\d+/)[0], 10);
        const base64Frame = data.toString("base64");

        // Add to frames array in the correct position
        frames[frameIndex] = {
          index: frameIndex,
          data: `data:image/png;base64,${base64Frame}`,
          timestamp: (frameIndex * 1000) / FPS,
        };

        // Send the frame to the client
        socket.emit("frame", {
          index: frameIndex,
          data: `data:image/png;base64,${base64Frame}`,
          timestamp: (frameIndex * 1000) / FPS,
        });
      });
    }
  });

  // Store the watcher in the map
  activeFrameWatchers.set(chatId, watcher);

  return watcher;
}

// Function to stop watching frames directory for a specific chat
function stopFrameWatcher(chatId) {
  const watcher = activeFrameWatchers.get(chatId);
  if (watcher) {
    console.log(`Stopping frame watcher for chat: ${chatId}`);
    watcher.close();
    activeFrameWatchers.delete(chatId);
  }
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Handle client joining a chat room
  socket.on("join_chat", (chatId) => {
    console.log(`Client ${socket.id} joined chat: ${chatId}`);
    socket.join(chatId);

    // Start watching for frames
    startFrameWatcher(chatId, socket);

    // Send initial video info
    socket.emit("video-info", {
      totalFrames: 0, // This will be updated as frames are added
      fps: FPS,
    });
  });

  // Handle client leaving a chat room
  socket.on("leave_chat", (chatId) => {
    console.log(`Client ${socket.id} left chat: ${chatId}`);
    socket.leave(chatId);

    // If no more clients in the room, stop watching
    const room = io.sockets.adapter.rooms.get(chatId);
    if (!room || room.size === 0) {
      stopFrameWatcher(chatId);
    }
  });

  // Handle client disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Stop any watchers this client might have started
    // This requires tracking which chats this socket was connected to
    // For simplicity, we'll leave this to be implemented in a more robust way
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
