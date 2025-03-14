document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const canvas = document.getElementById("video-canvas");
  const ctx = canvas.getContext("2d");
  const audioPlayer = document.getElementById("audio-player");
  const playButton = document.getElementById("play-button");
  const stopButton = document.getElementById("stop-button");
  const statusElement = document.getElementById("status");
  const frameInfoElement = document.getElementById("frame-info");
  const loadingElement = document.getElementById("loading");

  // Socket.io connection
  const socket = io();

  // Variables
  let allFrames = {};
  let totalFrames = 0;
  let fps = 30;
  let isPlaying = false;
  let framesReceived = 0;
  let lastDisplayedFrameIndex = -1;

  // Set up audio source
  audioPlayer.src = "/audio";
  audioPlayer.preload = "auto";

  // Initial canvas size
  canvas.width = 640;
  canvas.height = 360;

  // Socket events
  socket.on("connect", () => {
    statusElement.textContent = "Status: Connected to server";
  });

  socket.on("video-info", (info) => {
    totalFrames = info.totalFrames;
    fps = info.fps;
    statusElement.textContent = `Status: Loading frames (0/${totalFrames})`;

    // Tell server we're ready for frames
    socket.emit("ready");
  });

  // Receive frame from server and preload it
  socket.on("frame", (frameData) => {
    framesReceived++;

    // Create an Image object for preloading
    const img = new Image();
    img.src = frameData.data;

    allFrames[frameData.index] = {
      img: img,
      timestamp: frameData.timestamp,
    };

    // Update status
    statusElement.textContent = `Status: Loading frames (${framesReceived}/${totalFrames})`;
    loadingElement.textContent = `Loading: ${framesReceived}/${totalFrames} frames`;

    // Enable play when all frames are received
    if (framesReceived === totalFrames) {
      loadingElement.style.display = "none";
      statusElement.textContent = "Status: Ready to play";
      playButton.disabled = false;
    }
  });

  socket.on("error", (error) => {
    statusElement.textContent = `Error: ${error.message}`;
  });

  socket.on("stream-end", () => {
    statusElement.textContent = "Status: All frames received";
  });

  // UI events
  playButton.addEventListener("click", () => {
    if (!isPlaying) {
      startPlayback();
    } else {
      audioPlayer.play();
    }
  });

  stopButton.addEventListener("click", () => {
    stopPlayback();
  });

  // Audio player events
  audioPlayer.addEventListener("play", () => {
    isPlaying = true;
    statusElement.textContent = "Status: Playing";

    // Start rendering frames
    renderFrame();
  });

  audioPlayer.addEventListener("pause", () => {
    isPlaying = false;
    statusElement.textContent = "Status: Paused";
  });

  audioPlayer.addEventListener("ended", () => {
    stopPlayback();
  });

  function startPlayback() {
    if (framesReceived < totalFrames) {
      statusElement.textContent = "Status: Still loading frames...";
      return;
    }

    // Reset state
    isPlaying = true;
    lastDisplayedFrameIndex = -1;
    audioPlayer.currentTime = 0;
    audioPlayer.play();

    // Start rendering frames
    renderFrame();
  }

  function stopPlayback() {
    isPlaying = false;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;

    statusElement.textContent = "Status: Stopped";
  }

  // The core synchronization function
  function renderFrame() {
    if (!isPlaying) return;

    // Get current audio time in milliseconds
    const currentAudioTime = audioPlayer.currentTime * 1000;

    // Find the closest frame to display
    const expectedFrameIndex = Math.round(currentAudioTime / (900 / fps));

    if (
      expectedFrameIndex >= 0 &&
      expectedFrameIndex < totalFrames &&
      allFrames[expectedFrameIndex]
    ) {
      // Ensure we don’t skip frames by forcing the nearest frame to display
      if (expectedFrameIndex !== lastDisplayedFrameIndex) {
        displayFrame(expectedFrameIndex, allFrames[expectedFrameIndex].img);
        lastDisplayedFrameIndex = expectedFrameIndex;
      }
    }

    // Use fixed interval instead of requestAnimationFrame
    setTimeout(renderFrame, 1000 / fps);
  }

  function displayFrame(index, img) {
    if (!img) return;

    // Resize canvas if needed
    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    // Draw the frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Debugging output
    console.log(`Displaying Frame ${index}`);

    // Update frame info
    const expectedTimeMs = (index * 1000) / fps;
    const syncDiff = audioPlayer.currentTime * 1000 - expectedTimeMs;
    frameInfoElement.textContent = `Frame: ${index}/${totalFrames} | Audio: ${audioPlayer.currentTime.toFixed(
      2
    )}s | Sync diff: ${syncDiff.toFixed(2)}ms`;
  }

  // Initially disable play button until frames are loaded
  playButton.disabled = true;
});
