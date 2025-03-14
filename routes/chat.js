const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController"); // Import the chat controller
const authController = require("../controllers/authController");
const Chat = require("../schema/chatSchema");
const multer = require("multer");
const upload = multer(); // This is for file upload handling

// Endpoint to start a new chat session
// not yet
router.post("/start", chatController.startChat);

// Endpoint to send a message (either text or audio)
router.post(
  "/sendmessage",
  authController.verifyToken,
  chatController.processSpeechOutput
);

// Get list of chats for logged-in user
router.get("/list", authController.verifyToken, chatController.getChatList);

// Get chat history by chat ID
router.get("/:id", authController.verifyToken, async (req, res) => {
  console.log("Chat ID received:", req.params.id); // Debugging
  await chatController.getChatHistory(req, res);
});

// Create a new chat
router.post("/new", authController.verifyToken, chatController.NewChat);

module.exports = router;
