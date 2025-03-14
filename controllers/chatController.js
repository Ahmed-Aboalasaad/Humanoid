const fs = require("fs");
const path = require("path");
const LLM = require("../services/LLM"); // Import updated LLM module
const { ASR } = require("../services/ASR"); // Import updated ASR module
const generateSpeech = require("../services/TTS"); // Import updated TTS module
const Chat = require("../schema/chatSchema");
const jwt = require("jsonwebtoken");
const { startStreaming } = require("../controllers/streamingController");

// not yet
exports.startChat = async (userId) => {
  return sessionID;
};

// Function to handle speech input (either text or audio)
exports.processSpeechOutput = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Log body
    console.log("Request Files:", req.files); // Log files

    let textInput;
    const {
      input,
      lang = "en",
      chatId,
      options = {},
      character = "Abonga", // Default character
    } = req.body;

    let voiceId = determineVoiceId(character, lang);

    console.log("the chat id now connected :", chatId);

    // Check if input is provided
    if (!input && !req.files) {
      throw new Error("Input field is missing from the request body.");
    }

    // Step 1: Determine if input is text or audio
    textInput = await determineTheInputType(req, input, lang);

    // Step 2: Pass text input to LLM (GPT-4)
    console.log("Sending input to LLM...");
    const llmResponse = await LLM.LLM(textInput);
    console.log("Got LLM response:", llmResponse);

    // 3: Save the Chat into database
    await saveChatInDataBase(
      req,
      chatId,
      input,
      llmResponse,
      voiceId,
      character
    );

    // Step 4: Convert LLM response to speech (TTS)
    let audioBase64 = await convertLLMToAudio(llmResponse, voiceId, options);

    // Step 5: Return the LLM response and audio if available
    if (audioBase64) {
      console.log("return responce with both text and voice");
      res.json({ textResponce: llmResponse, audio: audioBase64 });
    } else {
      console.log("return responce only text ");
      res.json({ textResponce: llmResponse });
    }
  } catch (error) {
    console.error("Error processing speech input:", error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.NewChat = async (req, res) => {
  try {
    console.log("Request to make new Chat");
    const userId = req.user.userId; // Ensure this is a string
    console.log("the user in new chat:", userId);

    if (!userId) {
      return res.status(400).json({ error: "User ID is missing" });
    }

    // Create a new chat document
    const newChat = new Chat({ userId, messages: [] });

    try {
      await newChat.save(); // Save the new chat to the database
      console.log("Created new chat:", newChat);
      res.json(newChat);
    } catch (saveError) {
      console.error("Error saving new chat:", saveError.message);
      res.status(500).json({ error: "Failed to save chat" });
    }
  } catch (error) {
    console.error("Unexpected error:", error.message);
    res.status(500).json({ error: "Failed to create chat" });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    console.log("Start Getting history for this caht");
    const chatId = req.params.id;
    const userId = getUserByID(req); // Get the logged-in user's ID
    const chat = await Chat.findById(chatId);

    if (!chat || chat.userId.toString() !== userId) {
      return res.status(404).json({ error: "Chat not found or unauthorized" });
    }

    res.json(chat); // Send the chat data to the frontend
  } catch (error) {
    console.error("Error fetching chat history:", error.message);
    res.status(500).json({ error: "Failed to fetch chat" });
  }
};

exports.getChatList = async (req, res) => {
  console.log("Start getting the user chat list");
  try {
    const userId = req.userId; // Assume `userId` is set by `verifyToken`
    const chats = await Chat.find({ userId });
    console.log(`Chats List ${chats} `);
    console.log("user Chats list found and sent");
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chat list" });
  }
};

const getUserByID = function (req) {
  const token = req.headers.authorization.split(" ")[1];
  console.log(token);
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  return decodedToken.userId;
};

// Determine the input type and handle transcription
const determineTheInputType = async function (req, input, lang) {
  console.log("Determine the input type...");
  let textInput;

  if (typeof input === "string") {
    console.log("Processing text input...");
    textInput = input;
    return textInput;
  } else if (
    req.files &&
    req.files.input &&
    (req.files.input.mimetype === "audio/mp3" ||
      req.files.input.mimetype === "audio/wav")
  ) {
    console.log("Processing audio input...");

    const audioFilePath = path.join(__dirname, "uploads", req.files.input.name);

    // Save the uploaded audio file temporarily
    fs.writeFileSync(audioFilePath, req.files.input.data);

    try {
      // Communicate with the ASR Python service
      const formData = new FormData();
      formData.append("file", fs.createReadStream(audioFilePath));

      // Replace with the actual host and port where asrpy.py is running
      const ASR_SERVICE_URL = "http://localhost:5000/transcribe";

      const response = await axios.post(ASR_SERVICE_URL, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      if (response.status === 200 && response.data.transcription) {
        textInput = response.data.transcription;
        console.log("Transcription result:", textInput);
      } else {
        throw new Error("Failed to transcribe audio. Response:", response.data);
      }
    } catch (error) {
      console.error("Error communicating with ASR service:", error.message);
      throw new Error("Error during audio transcription.");
    } finally {
      // Clean up temporary audio file
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
    }
  } else {
    throw new Error("Unsupported input type. Expected text or audio.");
  }

  return textInput;
};

const saveChatInDataBase = async function (
  req,
  chatId,
  input,
  llmResponse,
  voiceId,
  character
) {
  console.log("Step 3: Save chat into database");
  // Step 3: Save the response in the database
  const userId = getUserByID(req);
  let chat;
  console.log("this message is saved into UserId :", userId);
  console.log("we are now in chatId", chatId);
  if (chatId) {
    // Find and validate the chat
    chat = await Chat.findById(chatId);
    if (!chat || chat.userId.toString() !== userId) {
      return res.status(404).json({ error: "Chat not found or unauthorized" });
    }
  } else {
    // Create a new chat if no chatId is provided
    chat = new Chat({ userId, messages: [] });
    chat.messages.push({
      requestText: input,
      responseText: llmResponse,
      voiceId,
      character,
    });
    await chat.save();

    console.log("chat input save successfully");
  }

  chat.messages.push({
    requestText: input,
    responseText: llmResponse,
    voiceId,
    character,
  });

  await chat.save();

  console.log("Saved successfully into database. into caht_id", chatId);
};

const convertLLMToAudio = async function (llmResponse, voiceId, options) {
  console.log("Step 4: Convert llm response to TTS");
  let audioBase64 = null;
  try {
    console.log("Sending LLM response to TTS...");
    audioBase64 = await generateSpeech(llmResponse, voiceId, options);
    console.log("TTS response generated successfully.");
    return audioBase64;
  } catch (ttsError) {
    console.error("TTS generation failed:", ttsError.message);
  }
};

const determineVoiceId = function (charc, lang) {
  let voiceId;

  const ElevenLabsVoices = {
    ar: {
      free: {
        Salma: {
          description: "Young and talented artist from Dubai",
          id: "aCChyB4P5WEomwRsOKRh",
        },
        Jafar: {
          description: "Egyptian and Modern Standard Arabic",
          id: "I6FCyzfC1FISEENiALlo",
        },
      },
      pro: {},
    },
    en: {
      free: {
        Rachel: {
          description: "American Calm Young Female Narration",
          id: "21m00Tcm4TlvDq8ikWAM",
        },
        Adam: {
          description: "American Deep Middle aged Male Narration",
          id: "pNInz6obpgDQGcFmaJgB",
        },
      },
      pro: {},
    },
  };

  if (charc == "Abonga" && lang == "ar") {
    voiceId = ElevenLabsVoices.ar.free.Jafar.id;
  } else if (charc == "Monga" && lang == "ar") {
    voiceId = ElevenLabsVoices.ar.free.Salma.id;
  } else if (charc == "Abonga" && lang == "en") {
    voiceId = ElevenLabsVoices.en.free.Adam.id;
  } else if (charc == "Monga" && lang == "en") {
    voiceId = ElevenLabsVoices.en.free.Rachel.id;
  }
  console.log("THE CHOSSEN VOICE IS : ", voiceId);

  return voiceId;
};
