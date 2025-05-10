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
console.log("Watching frames at:", FRAMES_DIR);


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
const FPS = 25; // Frames per second






// Function to start watching frames directory for a specific chat
function startFrameWatcher(chatId, socket) {
  let lastFrameTime = null;
let endSignalSent = false;
let hasStartedReceivingFrames = false;

  stopFrameWatcher(chatId);
  console.log(`[Watcher] Initial scan of ${FRAMES_DIR}:`);
  fs.readdir(FRAMES_DIR, (err, files) => {
    if (err) {
      console.error("[Watcher] Error reading directory:", err);
    } else {
      console.log(`[Watcher] Found ${files.length} files:`, files.slice(0, 10));
    }
  });

  const watcher = chokidar.watch(FRAMES_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 100,  // Wait 100ms after last change
      pollInterval: 100         // Check every 100ms
    },
    usePolling: true,           // Force polling (more reliable but higher CPU)
    interval: 100               // Polling interval
  });

  watcher.on("add", (filePath) => {

    if (!filePath.endsWith(".png")) return;

// Mark first frame reception
if (!hasStartedReceivingFrames) {
  hasStartedReceivingFrames = true;
  lastFrameTime = Date.now();
  endSignalSent = false;

  // Start 1s check loop ONLY after first frame
  setInterval(() => {
    const now = Date.now();
    if (
      hasStartedReceivingFrames &&
      now - lastFrameTime > 1000 &&
      !endSignalSent
    ) {
      console.log("[Watcher] No frames detected for 1 second. Emitting 'done'.");
      socket.emit("done");
      endSignalSent = true;
    }
  }, 500);
} else {
  lastFrameTime = Date.now();
  endSignalSent = false;
}




    console.log(`[Watcher] File event detected: ${filePath}`);
    if (filePath.endsWith(".png")) {
  
      fs.readFile(filePath, (err, data) => {
        if (err) {
          return console.error("[Watcher] Read error:", err);
        }
  
        const match = filePath.match(/(\d+)/);
        if (!match) return;
  
        const index = parseInt(match[0], 10);
        const base64 = data.toString("base64");
  
        socket.emit("frame", {
          index,
          data: `data:image/png;base64,${base64}`,
          timestamp: (index * 1000) / FPS,
        });
  
        console.log(`[Watcher] Sent frame ${index} to client ${socket.id}`);
  
        // 🚨 Delete the frame after sending
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`[Watcher] Failed to delete ${filePath}:`, unlinkErr);
          } else {
            console.log(`[Watcher] Deleted ${filePath}`);
          }
        });
      });
    }
  });
  

  activeFrameWatchers.set(chatId, watcher);
}

// Function to stop watching frames directory for a specific chat
function stopFrameWatcher(chatId) {
  const watcher = activeFrameWatchers.get(chatId);
  if (watcher) {
    console.log(`[Watcher] Stopping watcher for chat: ${chatId}`);
    watcher.close();
    activeFrameWatchers.delete(chatId);
  }
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on("join_chat", (chatId) => {
    console.log(`[Socket.IO] ${socket.id} joined chat: ${chatId}`);
    socket.join(chatId);
    startFrameWatcher(chatId, socket);
  });

  socket.on("leave_chat", (chatId) => {
    console.log(`[Socket.IO] ${socket.id} left chat: ${chatId}`);
    socket.leave(chatId);
    if (!(io.sockets.adapter.rooms.get(chatId)?.size > 0)) {
      stopFrameWatcher(chatId);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    // Optionally track socket-chatId map and clean up
  });
});


// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
