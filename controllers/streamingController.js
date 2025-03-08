const ffmpeg = require("fluent-ffmpeg");

// Allowed video file extensions
const ALLOWED_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "flv"]);

const isValidFile = (filename) => {
  return ALLOWED_EXTENSIONS.has(
    path.extname(filename).toLowerCase().substring(1)
  );
};

// Function to get video metadata (FPS, duration, frame count)
const getVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video"
      );

      if (!videoStream) return reject("No video stream found");

      const fps = eval(videoStream.r_frame_rate); // Converts "30/1" into 30
      const duration = parseFloat(videoStream.duration); // Video duration in seconds
      const totalFrames = Math.floor(fps * duration); // Total frames

      resolve({ fps, duration, totalFrames });
    });
  });
};

// Handle video upload and frame extraction
exports.extractFrames = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const videoFilePath = req.file.path;
  const videoFilename = req.file.originalname;

  if (!isValidFile(videoFilename)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid file type" });
  }

  try {
    fs.emptyDirSync(FRAMES_FOLDER);

    // Get video metadata
    const { fps, duration, totalFrames } = await getVideoMetadata(
      videoFilePath
    );

    // Read form data
    const numFrames = req.body.numFrames
      ? parseInt(req.body.numFrames)
      : undefined;
    const percentage = req.body.percentage
      ? parseFloat(req.body.percentage)
      : undefined;
    const fullFrames = req.body.fullFrames === "true";

    console.log("Extract Parameters:");
    console.log("The frames number:", numFrames);
    console.log("The frames percentage:", percentage);
    console.log("fullFrames:", fullFrames);

    // Determine the number of frames to extract
    let extractFrames = totalFrames; // Default to full extraction

    if (numFrames) {
      extractFrames = Math.min(numFrames, totalFrames);
    } else if (percentage) {
      extractFrames = Math.floor((percentage / 100) * totalFrames);
    } else if (fullFrames) {
      extractFrames = totalFrames;
    }

    extractFrames = Math.max(1, extractFrames);

    // Set frame extraction rate
    const extractionRate = totalFrames / extractFrames;

    const outputPattern = path.join(FRAMES_FOLDER, "frame_%04d.jpg");

    await new Promise((resolve, reject) => {
      ffmpeg(videoFilePath)
        .output(outputPattern)
        .outputOptions([`-vf`, `fps=${fps / extractionRate}`]) // Adjust frame rate dynamically
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Get extracted frames
    const frames = fs
      .readdirSync(FRAMES_FOLDER)
      .map((file) => `/frames/${file}`);

    fs.unlinkSync(videoFilePath); // Cleanup uploaded video

    res.json({ success: true, frames });
  } catch (error) {
    console.error("Error extracting frames:", error);
    res
      .status(500)
      .json({ success: false, message: "Frame extraction failed" });
  }
};

// Generate video from selected frames
exports.generateVideo = async (req, res) => {
  let { frames, frameRate, duration, numFrames } = req.body;

  if (!frames || frames.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No frames provided" });
  }

  // If numFrames & duration are provided, compute frameRate
  if (!frameRate && numFrames && duration) {
    frameRate = parseInt(numFrames) / parseFloat(duration);
  } else if (frameRate) {
    frameRate = parseInt(frameRate);
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Frame rate or duration is required" });
  }

  duration = parseFloat(duration);
  if (duration <= 0 || frameRate <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid duration or FPS" });
  }

  // Calculate required number of frames
  const requiredFrames = Math.floor(frameRate * duration);
  frames = frames.slice(0, requiredFrames); // Select only the needed frames

  console.log(
    `Generating video with FPS: ${frameRate}, Duration: ${duration}s, Using Frames: ${frames.length}`
  );

  if (frames.length < requiredFrames) {
    return res.status(400).json({
      success: false,
      message: `Not enough frames! Needed: ${requiredFrames}, but only have: ${frames.length}`,
    });
  }

  const outputVideoPath = path.join(
    VIDEO_FOLDER,
    `generated_video_${Date.now()}.mp4`
  );

  try {
    const inputPattern = path.join(FRAMES_FOLDER, "frame_%04d.jpg");

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPattern)
        .inputOptions(["-framerate", `${frameRate}`]) // Set input FPS
        .output(outputVideoPath)
        .outputOptions([
          "-r",
          `${frameRate}`, // Set output FPS
          "-pix_fmt",
          "yuv420p", // Standard pixel format
          "-c:v",
          "libx264", // Encode in H.264 format
          "-movflags",
          "+faststart", // Optimize for streaming
          `-t ${duration}`, // Force exact duration
        ])
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    res.json({
      success: true,
      videoUrl: `/videos/${path.basename(outputVideoPath)}`,
    });
  } catch (error) {
    console.error("Error generating video:", error);
    res
      .status(500)
      .json({ success: false, message: "Video generation failed" });
  }
};
