// Get token from the cookie
const token = getCookie("authToken");

document.addEventListener("DOMContentLoaded", () => {
  // ############################## Streaming Part ##############################################################################################

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

  // Playback controls
  function startPlayback() {
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

    isPlaying = true;
    lastDisplayedFrameIndex = -1;
    audioPlayer.currentTime = 0;
    audioPlayer
      .play()
      .catch((error) => console.error("Error playing audio:", error));
  }

  function stopPlayback() {
    isPlaying = false;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    statusElement.textContent = "Status: Stopped";
  }

  // UI Button Events
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
  // ########################################################################################################################################

  const chatInput = document.querySelector(".chat-input input");
  const micButton = document.querySelector(".mic-btn");
  const sendButton = document.querySelector(".chat-input button");
  const chatContainer = document.querySelector(".chat-container");
  const chatList = document.querySelector(".chat-list");
  const newChatButton = document.querySelector(".new-chat-button");
  const avatarList = document.querySelectorAll(".avatar-item");
  const languageButtons = document.querySelectorAll(".language-button");

  let mediaRecorder = null;
  let chunks = [];
  let audioBlob = null;
  let isRecording = false;
  let character = "Abonga";
  let lang = "en";
  let voiceId = "21m00Tcm4TlvDq8ikWAM";
  let options = {};
  let currentChatId = null;

  console.log("Token:", token);

  // Function to display a message in the chat
  function displayMessage(
    sender,
    messageContent,
    error = false,
    retryCallback = null
  ) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");

    if (sender === "You") {
      messageElement.classList.add("sent");
    }

    if (error) {
      const retryMessage = document.createElement("span");
      retryMessage.textContent = "Try Again";
      retryMessage.classList.add("retry-message");

      // Make the retry message clickable
      retryMessage.addEventListener("click", () => {
        // Hide the retry button temporarily
        retryMessage.style.display = "none";

        // Execute the retry callback
        if (retryCallback) {
          retryCallback(messageElement, retryMessage);
        }
      });

      messageElement.appendChild(retryMessage);
    } else {
      messageElement.innerHTML = `
      <div>${sender}</div>
      <div class="message-content">${messageContent}</div>
    `;
    }

    chatContainer.insertBefore(messageElement, chatInput.parentElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll to the bottom
  }

  // Function to clear current chat messages
  function clearCurrentChat() {
    Array.from(chatContainer.children).forEach((child) => {
      if (!child.classList.contains("chat-input")) {
        chatContainer.removeChild(child);
      }
    });
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
        fetchChatList();
      }

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

      displayMessage(character, data.textResponce);

      if (data.audio) {
        console.log("Audio data received. Calling playAudio...");
        playAudio(data.audio);
      } else {
        console.warn("No audio data received from the server.");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      displayMessage(character, "", true, (messageElement, retryMessage) => {
        sendMessageWithRetry(inputText, messageElement, retryMessage);
      });
    }
  }

  // Function to handle sending the message again when the "Try Again" button is clicked
  async function sendMessageWithRetry(inputText, messageElement, retryMessage) {
    try {
      // Retry sending the message
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

      // Replace the "Try Again" with the response content
      messageElement.innerHTML = `
      <div>${character}</div>
      <div class="message-content">${data.textResponce}</div>
    `;
      if (data.audio) playAudio(data.audio);
    } catch (error) {
      // If the retry fails again, make the "Try Again" button reappear
      console.error("Retry failed:", error);
      retryMessage.style.display = "inline"; // Re-show the "Try Again" message
    }
  }

  // Function to play audio
  function playAudio(base64Audio) {
    if (!base64Audio) {
      console.error("No audio data received.");
      return;
    }

    try {
      // Convert Base64 to Blob URL
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);

      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "audio/mpeg" }); // Adjust type if needed
      const audioUrl = URL.createObjectURL(blob);

      // Set new audio source
      audioPlayer.src = audioUrl;
      audioPlayer.load(); // Ensure audio is preloaded

      console.log("Audio URL set:", audioUrl);

      // Remove old event listeners to prevent duplication
      audioPlayer.oncanplaythrough = null;
      audioPlayer.onended = null;

      audioPlayer.oncanplaythrough = () => {
        console.log("Audio loaded successfully. Playing...");
        audioPlayer
          .play()
          .catch((error) => console.error("Error playing audio:", error));
        isPlaying = true;
        statusElement.textContent = "Status: Playing";
        renderFrame();
      };

      audioPlayer.onended = () => {
        stopPlayback();
      };
    } catch (error) {
      console.error("Error processing Base64 audio:", error);
    }
  }

  // Fetch chat list and populate
  async function fetchChatList() {
    try {
      const response = await fetch("/humaniod/chat/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch chat list");
      }

      const chats = await response.json();
      chatList.innerHTML = "";

      chats.forEach((chat) => {
        const listItem = document.createElement("li");
        listItem.textContent = chat.title || `Chat ${chat._id}`;
        listItem.dataset.chatId = chat._id;
        listItem.addEventListener("click", () => loadChat(chat._id));
        chatList.appendChild(listItem);
      });
    } catch (error) {
      console.error("Error fetching chat list:", error);
    }
  }

  // Load chat history
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
        // Display the request text (user message)
        displayMessage("You", message.requestText);

        // Display the response text (bot's reply)
        if (message.responseText) {
          displayMessage(character, message.responseText);
        }
      });
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  }

  // Create a new chat
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
      fetchChatList();
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  });

  // Initialize chat based on URL
  const urlPath = window.location.pathname;
  const chatIdFromURL = urlPath.split("/").pop();
  if (chatIdFromURL) {
    currentChatId = chatIdFromURL;
    loadChat(currentChatId);
  } else {
    fetchChatList();
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];
      mediaRecorder.start();
      isRecording = true;
      micButton.innerHTML = "⏹️"; // Indicate recording is in progress

      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);

      mediaRecorder.onstop = async () => {
        audioBlob = new Blob(chunks, { type: "audio/wav" });

        // Send the audioBlob to your ASR API
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
      micButton.innerHTML = "🎤"; // Reset button icon
    }
  }

  // Add event listeners for the microphone button
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

  // Add event listeners for space bar
  // let isSpacePressed = false;

  // document.addEventListener("keydown", async (event) => {
  //   if (event.code === "Space" && !isSpacePressed) {
  //     isSpacePressed = true; // Prevent multiple triggers
  //     if (!isRecording) {
  //       await startRecording();
  //     }
  //   }
  // });

  // document.addEventListener("keyup", async (event) => {
  //   if (event.code === "Space" && isSpacePressed) {
  //     isSpacePressed = false; // Allow space bar to trigger again
  //     stopRecording();
  //   }
  // });

  // Event listener for send button
  sendButton.addEventListener("click", () => {
    const inputText = chatInput.value.trim();
    if (!inputText) return;

    displayMessage("You", inputText);
    sendMessage(inputText);
    chatInput.value = "";
  });

  // Enable sending messages with Enter key
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendButton.click();
    }
  });

  // Avatar selection
  avatarList.forEach((avatar) => {
    avatar.addEventListener("click", () => {
      character = avatar.querySelector("span").textContent;
      avatarList.forEach((a) => a.classList.remove("selected"));
      avatar.classList.add("selected");

      // Replace the main avatar's image
      const mainAvatar = document.querySelector(".main-avatar");
      const selectedAvatarSrc = avatar.querySelector("img").getAttribute("src");
      mainAvatar.setAttribute("src", selectedAvatarSrc);

      console.log(character);
    });
  });

  // Language selection
  languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      lang = button.textContent === "عربي" ? "ar" : "en";
      languageButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });
});

// ###########################################################################################
// ###########################################################################################
// ###########################################################################################
function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const menuButton = document.querySelector(".menu-button");
  sidebar.classList.toggle("active");

  // Temporarily disable the button to prevent rapid toggling
  menuButton.disabled = true;
  setTimeout(() => {
    menuButton.disabled = false;
  }, 300); // Matches the sidebar transition time
}

function toggleChat() {
  document.querySelector(".chat-container").classList.toggle("hidden");
}
// Function to extract a specific cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

function clearCurrentChat() {
  const chatContainer = document.querySelector(".chat-container");

  // Remove all elements except the chat-input
  Array.from(chatContainer.children).forEach((child) => {
    if (!child.classList.contains("chat-input")) {
      chatContainer.removeChild(child);
    }
  });
}