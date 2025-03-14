const express = require("express");
const path = require("path");
const router = express.Router();
const authMiddleware = require("../controllers/authController");

// Serve the Login page
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/Login/login.html"));
});

// Serve the Signup page
router.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/Sign Up/signup.html"));
});

router.get("/chat", authMiddleware.verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/Chat/chat.html"));
});

// Serve the Chat page
router.get("/chat/:id", authMiddleware.verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/Chat/chat.html"));
});

// Serve the Home page
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/Home/home.html"));
});

module.exports = router;
