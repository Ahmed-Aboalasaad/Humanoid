const express = require("express");
const router = express.Router();
const streamingController = require("../controllers/streamingController");
const authMiddleware = require("../controllers/authController");

router.post("/generate-video");
router.post("/extract-frames");

module.exports = router;
