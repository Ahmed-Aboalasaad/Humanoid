const fs = require("fs");
const path = require("path");
const { ElevenLabsClient } = require("elevenlabs");
const { v4: uuid } = require("uuid");
const axios = require("axios");

// Setup HTTP Keep-Alive for better performance
const axiosInstance = axios.create({
  timeout: 10000, // Adjust timeout as needed
  httpAgent: new require("http").Agent({ keepAlive: true }),
  httpsAgent: new require("https").Agent({ keepAlive: true }),
});

const API_KEY = process.env.TTS_API_KEY;
const client = new ElevenLabsClient({ apiKey: API_KEY, axios: axiosInstance });

const OUTPUT_DIR = "./output";

// Ensure output directory exists once
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generateSpeech(text, voiceId, options = {}) {
  try {
    console.log(`TTS API KEY: ${API_KEY}`);
    console.log(`TTS Service: Getting Started`);
    console.log(
      `TTS Service: Options ${voiceId}, ${JSON.stringify(options, null, 2)}`
    );

    const flash = "eleven_flash_v2_5";

    // Generate audio
    const audio = await client.generate({
      voice: voiceId,
      model_id: flash,
      text,
      settings: options,
    });

    console.log(`TTS Service: Done Generating Voice`);

    // Save the audio file
    const audioFileName = `${uuid()}.mp3`;
    const audioFilePath = path.join(OUTPUT_DIR, audioFileName);
    const fileStream = fs.createWriteStream(audioFilePath);
    audio.pipe(fileStream);

    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    console.log(`Audio saved to: ${audioFilePath}`);

    // Encode the audio as Base64
    const audioBuffer = fs.readFileSync(audioFilePath);
    const base64Audio = audioBuffer.toString("base64");
    const textFileName = `${uuid()}.txt`;
    const textFilePath = path.join(OUTPUT_DIR, textFileName);
    fs.writeFileSync(textFilePath, base64Audio);

    console.log(`Encoded audio saved to: ${textFilePath}`);

    return base64Audio;
  } catch (error) {
    console.error(
      "Error generating speech:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
}


module.exports = generateSpeech;
