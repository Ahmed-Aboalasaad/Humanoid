const express = require("express");
const router = express.Router();
const streamingController = require("../controllers/streamingController");
const authMiddleware = require("../controllers/authController");

router.post("/generate-video", streamingController.generateVideo);
router.post("/extract-frames", streamingController.extractFrames);

module.exports = router;
