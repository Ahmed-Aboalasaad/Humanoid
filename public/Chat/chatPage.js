document.addEventListener("DOMContentLoaded", function () {
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const chatBox = document.getElementById("messages");
  const chatBox_ = document.getElementById("chatBox");
  const chatbotToggle = document.getElementById("chatbotToggle");
  const chatContainer = document.getElementById("chatContainer");
  const menuButton = document.getElementById("menuButton");
  const sidebar = document.getElementById("sidebar");
  const closeMenu = document.getElementById("closeMenu");
  const micButton = document.getElementById("micButton");
  const speakerButton = document.getElementById("speakerButton");
  const micPopup = document.getElementById("micPopup");
  const speakerPopup = document.getElementById("speakerPopup");
  const micIcon = document.getElementById("micIcon");
  const speakerIcon = document.getElementById("speakerIcon");
  const profileButton = document.getElementById("profileButton");
  const profilePopup = document.getElementById("profilePopup");
  const characterImage = document.getElementById("characterImage");
  const messageIcon = document.getElementById("messageIcon");
  const animatedCharacter = document.querySelector(".animated-character");

  let isMicOn = false;
  let isSpeakerOn = false;
  let isChatHidden = false;
  let isSidebarOpen = false;
  let isChatVisible = true; 
  let isCharacterCentered = false; 
  let selectedCharacter = "Bonga";
  let selectedLanguage = "en"; 
  let messages = [];

  const translations = {
    "Hello! How can I help?": "مرحبًا! كيف يمكنني المساعدة؟"
  };

  function translateMessage(text) {
    return selectedLanguage === "ar" ? (translations[text] || text) : text;
  }

  function renderMessages() {
    const chatBox = document.getElementById("chatBox"); 
    const isAtBottom = chatBox.scrollHeight - chatBox.clientHeight <= chatBox.scrollTop + 10;

    chatBox.innerHTML = ""; 
    console.log("Rendering messages:", messages);

    const selectedCharacterElement = document.querySelector(".character-list li.selected");
    const selectedCharacter = selectedCharacterElement 
        ? selectedCharacterElement.getAttribute("data-character") 
        : "Bonga"; 

    messages.forEach(msg => {
        const messageElement = document.createElement("div");
        messageElement.classList.add("chat-content");
        messageElement.innerHTML = `
            <span class="${msg.sender === "user" ? "name user" : "name bot"}">
                ${msg.sender === "user" ? "You" : selectedCharacter}
            </span>
            <div class="chat-message ${msg.sender}">
            ${translateMessage(msg.text)}
            </div>
        `;
        chatBox.appendChild(messageElement);
    });

    if (!chatBox.dataset.userScrolling) {
        chatBox.scrollTop = chatBox.scrollHeight;
    } else if (isAtBottom) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
  }

  document.querySelectorAll(".character-list li").forEach(item => {
    item.addEventListener("click", function () {
        document.querySelectorAll(".character-list li").forEach(li => li.classList.remove("selected"));
        this.classList.add("selected");
        renderMessages();
    });
  });

  sendButton.addEventListener("click", function () {
    const newMessage = messageInput.value.trim();
    if (newMessage) {
      messages.push({ sender: "user", text: newMessage });
      messages.push({ sender: "bot", text: "Hello! How can I help?" });
      messageInput.value = "";
      renderMessages();
    }
  });

  messageInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      sendButton.click();
    }
  });

  document.getElementById("newChatButton").addEventListener("click", function () {
    messages = []; 
    renderMessages(); 
  });

  chatbotToggle.addEventListener("click", function () {
    isChatHidden = !isChatHidden;
    chatContainer.style.display = isChatHidden ? "none" : "block";
  });

  menuButton.addEventListener("click", function () {
    sidebar.classList.add("open");
    menuButton.style.display = "none";
    chatContainer.style.display = "none";
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

    messageIcon.src = isChatVisible ? "./images/message.png" : "./images/message_closed.png";

    isCharacterCentered = !isCharacterCentered;
    if (isCharacterCentered) {
        characterImage.classList.add("expanded-message");
    } else {
        characterImage.classList.remove("expanded-message");
    }
  });

  micButton.addEventListener("click", function () {
    isMicOn = !isMicOn; 
    micIcon.src = isMicOn ? "./images/mic.png" : "./images/mic_closed.png";

    if (isMicOn) { 
      micPopup.style.display = "block";
      clearTimeout(micPopup.timeout);
      micPopup.timeout = setTimeout(() => { micPopup.style.display = "none"; }, 2000);
    }
  });

  speakerButton.addEventListener("click", function () {
    isSpeakerOn = !isSpeakerOn; 
    speakerIcon.src = isSpeakerOn ? "./images/speaker.png" : "./images/speaker_closed.png";

    if (isSpeakerOn) { 
      speakerPopup.style.display = "block";
      clearTimeout(speakerPopup.timeout);
      speakerPopup.timeout = setTimeout(() => { speakerPopup.style.display = "none"; }, 2000);
    }
  });

  profileButton.addEventListener("click", function () {
    profilePopup.classList.toggle("show");
  });

  document.getElementById("arButton").addEventListener("click", function () {
    selectedLanguage = "ar";
    document.getElementById("arButton").classList.add("active");
    document.getElementById("enButton").classList.remove("active");
    document.getElementById("enButton").classList.add("inactive");
    updateChatMessages(); 
  });

  document.getElementById("enButton").addEventListener("click", function () {
    selectedLanguage = "en";
    document.getElementById("enButton").classList.add("active");
    document.getElementById("arButton").classList.remove("active");
    document.getElementById("arButton").classList.add("inactive");
    updateChatMessages(); 
  });

  function updateChatMessages() {
    renderMessages(); 
  }

  document.querySelectorAll(".character-list li").forEach(item => {
    item.addEventListener("click", function () {
      selectedCharacter = this.getAttribute("data-character");
      characterImage.src = selectedCharacter === "Bonga" ? "./images/bonga.jpg" : "./images/monga.png";
      renderMessages();
    });
  });

  renderMessages();
  });
