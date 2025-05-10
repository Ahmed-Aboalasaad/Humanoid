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
    console.log("[processSpeechOutput] Request Body:", req.body);
    console.log("[processSpeechOutput] Request Files:", req.files);

    const {
      input,
      lang = "en",
      chatId,
      options = {},
      character
    } = req.body;

    if (!chatId) throw new Error("chatId is required to stream frames");

    const fs = require("fs");
    const path = require("path");
    const { exec } = require("child_process");
    const util = require("util");
    const execPromise = util.promisify(exec);
    const framesDir = path.join(__dirname, "../generator/frames");



    let voiceId = determineVoiceId(character, lang);

    if (!input && !req.files) {
      throw new Error("Input field is missing from the request body.");
    }

    // 1. Determine input type (text or audio)
    const textInput = await determineTheInputType(req, input, lang);
    console.log("[processSpeechOutput] Input processed as:", textInput);

    // 2. Pass to LLM
    const llmResponse = await LLM.LLM(textInput);
    console.log("[processSpeechOutput] LLM Response:", llmResponse);

    // 3. Save to DB
    await saveChatInDataBase(req, chatId, input, llmResponse, voiceId, character);

    // 4. Convert to Audio
    const audioBase64 = await convertLLMToAudio(llmResponse, voiceId, options);

    // IMPORTANT: Send the response immediately to the client with text and audio
    // This allows the client to display text and play audio while frames are generating
    res.json({
      textResponce: llmResponse,
      ...(audioBase64 ? { audio: audioBase64 } : {}),
    });

    // Continue with frame generation in the background after sending response
    (async () => {
      try {
        // 5. Clear frames
        console.log("[processSpeechOutput] Clearing old frames in:", framesDir);
        const files = fs.readdirSync(framesDir);
        for (const file of files) {
          if (file.endsWith(".png")) {
            fs.unlinkSync(path.join(framesDir, file));
          }
        }

        // Get the most recently generated MP3 file
        const mp3FilePath = await getMostRecentFile('output', '.mp3');
        if (!mp3FilePath) {
          console.error("[processSpeechOutput] No MP3 file found in output directory");
          return;
        }
        console.log(`[processSpeechOutput] Found MP3 file: ${mp3FilePath}`);

        // Convert MP3 to WAV
        const wavFileName = path.basename(mp3FilePath, '.mp3') + '.wav';
        const wavFilePath = path.join('output', wavFileName);
        
        console.log(`[processSpeechOutput] Converting MP3 to WAV: ${wavFilePath}`);
        await execPromise(`ffmpeg -y -i "${mp3FilePath}" -acodec pcm_s16le -ar 16000 -ac 1 "${wavFilePath}"`);
        console.log(`[processSpeechOutput] Conversion complete: ${wavFilePath}`);

        // 6. Run Python Script with the converted WAV file (Obama)
        let pythonCommand;
        if(character == "Abonga"){
        pythonCommand = `python /home/humanoid/TalkingGaussian/scripts/infer.py Obama English 1 "/home/humanoid/HumanoidApp/${wavFilePath}" "${framesDir}"`;
        }
        else{
          pythonCommand = `python /home/humanoid/TalkingGaussian/scripts/infer.py May English 1 "/home/humanoid/HumanoidApp/${wavFilePath}" "${framesDir}"`;
        }
        
        console.log("[processSpeechOutput] Running Python command:", pythonCommand);
        
        try {
          const { stdout, stderr } = await execPromise(pythonCommand);
          if (stderr) {
            console.error("[processSpeechOutput] Python stderr:", stderr);
          }
          console.log("[processSpeechOutput] Python stdout:", stdout);
        } catch (error) {
          console.error("[processSpeechOutput] Python execution error:", error);
        }

        // Check generated frames for debugging
        const generatedFrames = fs.readdirSync(framesDir).filter(f => f.endsWith('.png'));
        console.log(`[processSpeechOutput] Generated ${generatedFrames.length} frames`);
      } catch (error) {
        console.error("[processSpeechOutput] Background processing error:", error.message);
      }
    })();
    
  } catch (error) {
    console.error("[processSpeechOutput] Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to get the most recent file with a specific extension
async function getMostRecentFile(directory, extension) {
  const fs = require('fs');
  const path = require('path');
  
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Filter files by extension
      const filteredFiles = files.filter(file => file.endsWith(extension));
      
      if (filteredFiles.length === 0) {
        resolve(null);
        return;
      }
      
      // Get file stats to determine the most recent one
      let mostRecentFile = null;
      let mostRecentTime = 0;
      
      let processed = 0;
      filteredFiles.forEach(file => {
        const filePath = path.join(directory, file);
        fs.stat(filePath, (err, stats) => {
          processed++;
          
          if (!err && stats.isFile()) {
            if (stats.mtimeMs > mostRecentTime) {
              mostRecentTime = stats.mtimeMs;
              mostRecentFile = filePath;
            }
          }
          
          if (processed === filteredFiles.length) {
            resolve(mostRecentFile);
          }
        });
      });
    });
  });
}

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
          id: "nPczCjzI2devNBz1zQrb",
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
