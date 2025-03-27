document.addEventListener("DOMContentLoaded", function () {
  const chatbotToggle = document.getElementById("chatbotToggle");
  const chatContainer = document.getElementById("chatContainer");
  const menuButton = document.getElementById("menuButton");
  const sidebar = document.getElementById("sidebar");
  const closeMenu = document.getElementById("closeMenu");
  const speakerButton = document.getElementById("speakerButton");
  const speakerIcon = document.getElementById("speakerIcon");
  const profileButton = document.getElementById("profileButton");
  const profilePopup = document.getElementById("profilePopup");
  const characterImage = document.getElementById("characterImage");
  const messageIcon = document.getElementById("messageIcon");
  const animatedCharacter = document.querySelector(".animated-character");
  const chatInput = document.querySelector(".chat-input input");
  const sendButton = document.querySelector(".chat-input button");
  const chatList = document.querySelector(".chat-list");
  const newChatButton = document.querySelector(".new-chat-btn");
  const chat = document.querySelector(".chat");

  const audioPlayer = document.getElementById("audio-player");
  const canvas = document.getElementById("video-canvas");
  const ctx = canvas.getContext("2d");
  const statusElement = document.getElementById("status");
  const loadingElement = document.getElementById("loading");
  const frameInfoElement = document.getElementById("frame-info");

  // Set fixed canvas dimensions
  canvas.width = 500;
  canvas.height = 500;
  canvas.style.display = "block";
  canvas.style.margin = "0 auto";

  // Variables
  let isSpeakerOn = true;
  let isChatHidden = false;
  let isChatVisible = true;
  let isCharacterCentered = false;
  let mediaRecorder = null;
  let chunks = [];
  let audioBlob = null;
  let isRecording = false;
  let character = "Abonga";
  let lang = "en";
  let voiceId = "21m00Tcm4TlvDq8ikWAM";
  let options = {};
  let currentChatId = null;

  // Socket.io connection
  const socket = io();

  // Frame and playback variables
  let allFrames = {};
  let frameBuffer = [];
  let totalFrames = 0;
  let fps = 30;
  let isPlaying = false;
  let framesReceived = 0;
  let lastDisplayedFrameIndex = -1;
  let renderLoopActive = false;
  let pendingLLMResponse = null;
  let pendingAudioData = null;

  // Buffer settings
  const BUFFER_THRESHOLD = 200; // Number of frames to buffer before starting playback
  const BUFFER_MIN_THRESHOLD = 10; // Minimum buffer size before pausing

  console.log("Token:", token);
  const urlPath = window.location.pathname;
  const chatIdFromURL = urlPath.split("/").pop();
  if (chatIdFromURL) {
    currentChatId = chatIdFromURL;
    loadChat(currentChatId);
  }

  socket.on("connect", () => {
    statusElement.textContent = "Status: Connected to server";
  });

  socket.on("video-info", (info) => {
    console.log("Successfull in Socket video-info");
    totalFrames = info.totalFrames;
    fps = info.fps;
    statusElement.textContent = `Status: Waiting for frames (0/${BUFFER_THRESHOLD})`;
  });

  // Receive frame from server and buffer it
  socket.on("frame", (frameData) => {
    console.log("Frame received:", frameData.index);
    framesReceived++;
    totalFrames = Math.max(totalFrames, frameData.index + 1);

    // Create an Image object for preloading
    const img = new Image();
    img.src = frameData.data;

    // Add frame to buffer and organized collection
    frameBuffer.push(frameData);
    allFrames[frameData.index] = {
      img: img,
      timestamp: frameData.timestamp,
    };

    // Sort the buffer by frame index to ensure proper order
    frameBuffer.sort((a, b) => a.index - b.index);

    // Update status
    statusElement.textContent = `Status: Buffering frames (${frameBuffer.length}/${BUFFER_THRESHOLD})`;
    loadingElement.textContent = `Loading: ${frameBuffer.length}/${BUFFER_THRESHOLD} frames buffered`;

    // Check if we've reached the buffer threshold and have pending content to display
    if (
      frameBuffer.length >= BUFFER_THRESHOLD &&
      pendingLLMResponse &&
      pendingAudioData
    ) {
      // Display the LLM response
      displayMessage(character, pendingLLMResponse);

      // Play the audio
      playAudio(pendingAudioData);

      // Reset pending data
      pendingLLMResponse = null;
      pendingAudioData = null;

      loadingElement.style.display = "none";
      statusElement.textContent = "Status: Playback started";
    }
  });

  socket.on("error", (error) => {
    statusElement.textContent = `Error: ${error.message}`;
  });

  chatbotToggle.addEventListener("click", function () {
    isChatHidden = !isChatHidden;
    chatContainer.style.display = isChatHidden ? "none" : "block";
  });

  menuButton.addEventListener("click", function () {
    sidebar.classList.add("open");
    menuButton.style.display = "none";
    // chatContainer.style.display = "none";
    animatedCharacter.classList.add("expanded-menu");
  });

  closeMenu.addEventListener("click", function () {
    sidebar.classList.remove("open");
    menuButton.style.display = "block";
    chatContainer.style.display = "flex";
    animatedCharacter.classList.remove("expanded-menu");
  });

  messageIcon.addEventListener("click", function () {
    isChatVisible = !isChatVisible;
    chatContainer.style.display = isChatVisible ? "block" : "none";
    messageIcon.src = isChatVisible
      ? "./images/message.png"
      : "./images/message_closed.png";
    isCharacterCentered = !isCharacterCentered;
    if (isCharacterCentered) {
      characterImage.classList.add("expanded-message");
    } else {
      characterImage.classList.remove("expanded-message");
    }
  });

  speakerButton.addEventListener("click", function () {
    isSpeakerOn = !isSpeakerOn;
    speakerIcon.src = isSpeakerOn
      ? "./images/speaker.png"
      : "./images/speaker_closed.png";

    audioPlayer.muted = !isSpeakerOn;
  });

  document.getElementById("arButton").addEventListener("click", function () {
    selectedLanguage = "ar";
    document.getElementById("arButton").classList.add("active");
    document.getElementById("enButton").classList.remove("active");
    document.getElementById("enButton").classList.add("inactive");
  });

  document.getElementById("enButton").addEventListener("click", function () {
    selectedLanguage = "en";
    document.getElementById("enButton").classList.add("active");
    document.getElementById("arButton").classList.remove("active");
    document.getElementById("arButton").classList.add("inactive");
  });

  document.querySelectorAll(".character-list li").forEach((item) => {
    item.addEventListener("click", function () {
      character = this.getAttribute("data-character");
      characterImage.src =
        character === "Abonga" ? "./images/bonga.jpg" : "./images/monga.png";
    });
  });

  function displayMessage(
    sender,
    messageContent,
    error = false,
    retryCallback = null
  ) {
    const messageWrapper = document.createElement("div");
    messageWrapper.classList.add("chat-content");
    const isUser = sender === "You";
    const senderName = isUser ? "You" : character;

    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message", isUser ? "user" : "bot");

    if (error) {
      messageElement.innerHTML = `
              <span class="error-message">Error sending message</span>
              <button class="retry-button">Try Again</button>
          `;
      const retryButton = messageElement.querySelector(".retry-button");
      retryButton.addEventListener("click", () => {
        retryButton.style.display = "none";
        if (retryCallback) {
          retryCallback(messageElement, retryButton);
        }
      });
    } else {
      messageElement.textContent = messageContent;
    }
    const nameElement = document.createElement("span");
    nameElement.classList.add("name", isUser ? "user" : "bot");
    nameElement.textContent = senderName;

    messageWrapper.appendChild(nameElement);
    messageWrapper.appendChild(messageElement);

    chat.appendChild(messageWrapper);
    chat.scrollTop = chat.scrollHeight;
  }

  sendButton.addEventListener("click", () => {
    const inputText = chatInput.value.trim();
    if (!inputText) return;

    displayMessage("You", inputText);
    sendMessage(inputText);
    chatInput.value = "";
  });

  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendButton.click();
    }
  });

  function clearCurrentChat() {
    Array.from(chat.children).forEach((child) => {
      if (!child.classList.contains("chat-input")) {
        chat.removeChild(child);
      }
    });
  }

  newChatButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/humaniod/chat/new", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to create new chat");
      }
      const newChat = await response.json();
      currentChatId = newChat._id;
      window.history.pushState({}, "", `/chat/${currentChatId}`);
      clearCurrentChat();
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  });

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];
      mediaRecorder.start();
      isRecording = true;
      micButton.innerHTML = '<img src="./images/mic.png" alt="Mic Icon">';
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = async () => {
        audioBlob = new Blob(chunks, { type: "audio/wav" });

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.wav");

        try {
          const response = await fetch("http://127.0.0.1:5000/transcribe", {
            method: "POST",
            body: formData,
          });

          const result = await response.json();

          if (result.transcription) {
            displayMessage("You", result.transcription);
            sendMessage(result.transcription);
          } else {
            displayMessage("System", "Transcription failed. Please try again.");
          }
        } catch (error) {
          console.error("Error during transcription:", error);
          displayMessage("System", "Error: Unable to connect to server.");
        }
      };
    } catch (err) {
      alert("Could not access your microphone. Please check your settings.");
      console.error(err);
    }
  }

  function stopRecording() {
    if (isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      micButton.innerHTML =
        '<img src="./images/mic_closed.png" alt="Mic Icon">';
    }
  }

  micButton.addEventListener("click", async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone access is not supported in your browser.");
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  });

  async function loadChat(chatId) {
    try {
      currentChatId = chatId;
      window.history.pushState({}, "", `/chat/${chatId}`);

      const response = await fetch(`/humaniod/chat/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load chat");
      }

      const chat = await response.json();
      clearCurrentChat();

      chat.messages.forEach((message) => {
        displayMessage("You", message.requestText);

        if (message.responseText) {
          displayMessage(character, message.responseText);
        }
      });
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  }

  // The core synchronization function with buffer management
  function renderFrame() {
    console.log(
      "Ready to render. Buffer:",
      frameBuffer.length,
      "Total:",
      totalFrames
    );

    console.log("renderFrame called");
    // Exit if playback is not active
    if (!isPlaying || !renderLoopActive) {
      console.log(
        "Exiting render loop because isPlaying =",
        isPlaying,
        "or renderLoopActive =",
        renderLoopActive
      );
      return;
    }

    // Check buffer size - pause if too low
    if (frameBuffer.length < BUFFER_MIN_THRESHOLD) {
      console.log(
        `Buffer too low (${frameBuffer.length}/${BUFFER_MIN_THRESHOLD}). Pausing playback.`
      );
      audioPlayer.pause();
      statusElement.textContent = `Status: Buffering (${frameBuffer.length}/${BUFFER_THRESHOLD})`;

      // Continue checking buffer size without rendering frames
      setTimeout(renderFrame, 100);
      return;
    } else if (audioPlayer.paused && frameBuffer.length >= BUFFER_THRESHOLD) {
      // Resume playback if we have enough frames
      console.log(
        `Buffer refilled (${frameBuffer.length}/${BUFFER_THRESHOLD}). Resuming playback.`
      );
      audioPlayer
        .play()
        .catch((error) => console.error("Error resuming audio:", error));
      statusElement.textContent = "Status: Playback resumed";
    }

    // Get current audio time in milliseconds
    const currentAudioTime = audioPlayer.currentTime * 1000;

    // Find the closest frame to display
    const expectedFrameIndex = Math.round(currentAudioTime / (1000 / fps));

    if (
      expectedFrameIndex >= 0 &&
      expectedFrameIndex < totalFrames &&
      allFrames[expectedFrameIndex]
    ) {
      // Ensure we don't display the same frame twice
      if (expectedFrameIndex !== lastDisplayedFrameIndex) {
        // Display the frame
        displayFrame(expectedFrameIndex, allFrames[expectedFrameIndex].img);

        // Decrease totalFrames as frames are displayed
        totalFrames = Math.max(0, totalFrames - 1);

        // Update last displayed frame index
        lastDisplayedFrameIndex = expectedFrameIndex;

        // Remove displayed frames from buffer
        frameBuffer = frameBuffer.filter(
          (frame) => frame.index > expectedFrameIndex
        );
      }
    }

    // Only continue the loop if we're still playing
    if (isPlaying && renderLoopActive) {
      // Schedule next frame render based on FPS
      setTimeout(renderFrame, 1000 / fps);
    } else {
      console.log(
        "Not scheduling next frame because isPlaying =",
        isPlaying,
        "or renderLoopActive =",
        renderLoopActive
      );
    }
  }

  function displayFrame(index, img) {
    if (!img) {
      console.log("Image missing for frame", index);
      return;
    }
    console.log("Displaying Frame:", index);
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling and position to fit the image within the canvas
    // while maintaining aspect ratio
    const hRatio = canvas.width / img.width;
    const vRatio = canvas.height / img.height;
    const ratio = Math.min(hRatio, vRatio);

    // Calculate centered position
    const centerX = (canvas.width - img.width * ratio) / 2;
    const centerY = (canvas.height - img.height * ratio) / 2;

    // Draw the frame scaled and centered
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      centerX,
      centerY,
      img.width * ratio,
      img.height * ratio
    );

    // Update frame info
    const expectedTimeMs = (index * 1000) / fps;
    const syncDiff = audioPlayer.currentTime * 1000 - expectedTimeMs;
    frameInfoElement.textContent = `Frame: ${index} | Buffer: ${
      frameBuffer.length
    } | Audio: ${audioPlayer.currentTime.toFixed(
      2
    )}s | Sync diff: ${syncDiff.toFixed(2)}ms`;
  }

  // Clean up all event listeners before setting new ones
  function cleanupAudioListeners() {
    console.log("Cleaning up audio event listeners");
    audioPlayer.oncanplaythrough = null;
    audioPlayer.onended = null;
    audioPlayer.onpause = null;
    audioPlayer.onplay = null;
  }

  // Set up audio event listeners
  function setupAudioListeners() {
    console.log("Setting up audio event listeners");

    cleanupAudioListeners();

    audioPlayer.oncanplaythrough = () => {
      console.log("Audio loaded successfully. Ready to play.");
    };

    audioPlayer.onended = () => {
      console.log("Audio ended event triggered");
      isPlaying = false;
      renderLoopActive = false;
      statusElement.textContent = "Status: Playback completed";
      console.log(
        "End of audio reached. isPlaying =",
        isPlaying,
        "renderLoopActive =",
        renderLoopActive
      );
    };

    audioPlayer.onpause = () => {
      console.log("Audio paused");
      // Don't set isPlaying to false here to allow buffer-based pausing
    };

    audioPlayer.onplay = () => {
      console.log("Audio play event triggered, isPlaying =", isPlaying);
      if (!renderLoopActive && isPlaying) {
        console.log("Restarting render loop from onplay");
        renderLoopActive = true;
        renderFrame();
      }
    };
  }

  // Initial setup of audio listeners
  setupAudioListeners();

  function startPlayback() {
    console.log("startPlayback called");

    if (!audioPlayer.src || audioPlayer.src === "") {
      console.error("No audio loaded.");
      return;
    }

    if (audioPlayer.readyState < 2) {
      // Wait until audio is fully loaded
      console.warn("Audio not ready yet, waiting...");
      audioPlayer.addEventListener("canplaythrough", startPlayback, {
        once: true,
      });
      return;
    }

    // Reset state
    isPlaying = true;
    renderLoopActive = false;
    lastDisplayedFrameIndex = -1;
    audioPlayer.currentTime = 0;

    console.log("Starting audio playback, isPlaying =", isPlaying);
    audioPlayer
      .play()
      .catch((error) => console.error("Error playing audio:", error));

    // Start the rendering loop only if not already active
    if (!renderLoopActive) {
      console.log("Starting render loop");
      renderLoopActive = true;
      renderFrame();
    }
  }

  function stopPlayback() {
    console.log("stopPlayback called");
    isPlaying = false;
    renderLoopActive = false;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    statusElement.textContent = "Status: Stopped";
    console.log(
      "Playback stopped, isPlaying =",
      isPlaying,
      "renderLoopActive =",
      renderLoopActive
    );
  }

  // Function to play audio with buffer management
  function playAudio(base64Audio) {
    console.log("playAudio called with new audio data");

    if (!base64Audio) {
      console.error("No audio data received.");
      return;
    }

    try {
      // Stop any existing playback
      stopPlayback();

      // Convert Base64 to Blob URL
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(blob);

      // Set new audio source
      audioPlayer.src = audioUrl;
      audioPlayer.load(); // Ensure audio is preloaded

      console.log("Audio URL set:", audioUrl);

      audioPlayer.oncanplaythrough = () => {
        console.log("Audio loaded successfully. Playing...");

        // Only start playback if we have enough frames buffered
        if (frameBuffer.length >= BUFFER_THRESHOLD) {
          // Set playback state
          isPlaying = true;
          renderLoopActive = true;

          // Start audio playback
          audioPlayer
            .play()
            .catch((error) => console.error("Error playing audio:", error));

          statusElement.textContent = "Status: Playing";

          // Start the render loop
          renderFrame();
        } else {
          statusElement.textContent = `Status: Waiting for frames (${frameBuffer.length}/${BUFFER_THRESHOLD})`;
        }
      };
    } catch (error) {
      console.error("Error processing Base64 audio:", error);
    }
  }

  // Function to send a message to the endpoint
  async function sendMessage(inputText) {
    try {
      if (!currentChatId) {
        const response = await fetch("/humaniod/chat/new", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to create new chat");
        }

        const newChat = await response.json();
        currentChatId = newChat._id;
        window.history.pushState({}, "", `/chat/${currentChatId}`);
      }

      // Join the socket.io room for this chat
      socket.emit("join_chat", currentChatId);

      const response = await fetch("/humaniod/chat/sendmessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: inputText,
          chatId: currentChatId,
          character,
          voiceId,
          lang,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch the bot response");
      }

      const data = await response.json();

      // Store the LLM response and audio for later display
      pendingLLMResponse = data.textResponce;

      if (data.audio) {
        console.log(
          "Audio data received. Storing for playback when buffered..."
        );
        pendingAudioData = data.audio;

        // Clear existing frames for new conversation
        allFrames = {};
        frameBuffer = [];
        framesReceived = 0;

        // Check if we already have enough buffered frames to start playback
        if (frameBuffer.length >= BUFFER_THRESHOLD) {
          // Display the message and play audio immediately
          displayMessage(character, pendingLLMResponse);
          playAudio(pendingAudioData);

          // Reset pending data
          pendingLLMResponse = null;
          pendingAudioData = null;
        } else {
          // Update status to show waiting for buffer
          statusElement.textContent = `Status: Waiting for frames (${frameBuffer.length}/${BUFFER_THRESHOLD})`;
          loadingElement.style.display = "block";
          loadingElement.textContent = `Loading: ${frameBuffer.length}/${BUFFER_THRESHOLD} frames buffered`;
        }
      } else {
        console.warn("No audio data received from the server.");
        // Display the message anyway if no audio
        displayMessage(character, data.textResponce);
        pendingLLMResponse = null;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      displayMessage(character, "", true, (messageElement, retryMessage) => {
        sendMessageWithRetry(inputText, messageElement, retryMessage);
      });
    }
  }

  async function sendMessageWithRetry(inputText, messageElement, retryMessage) {
    try {
      const response = await fetch("/humaniod/chat/sendmessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: inputText,
          chatId: currentChatId,
          character,
          voiceId,
          lang,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch the bot response");
      }

      const data = await response.json();
      messageElement.innerHTML = `
      <div>${character}</div>
      <div class="message-content">${data.textResponce}</div>
    `;
      if (data.audio) playAudio(data.audio);
    } catch (error) {
      console.error("Retry failed:", error);
      retryMessage.style.display = "inline";
    }
  }
});

const token = getCookie("authToken");
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}
