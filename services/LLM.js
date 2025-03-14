const axios = require("axios");
const https = require("https");

// Set up the OpenAI API key and endpoint
const OPENAI_API_KEY = process.env.LLM_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Persistent HTTPS agent for session connection
const httpsAgent = new https.Agent({ keepAlive: true });

// Message history storage
let messageHistory = [
  { role: "system", content: "You are a helpful assistant." },
];

// Token limit and message management
const MAX_SUMMARY_TOKENS = 500; // Token limit for summaries
const MAX_RESPONSE_TOKENS = 2000; // Token limit for responses

// Summarize function
async function summarizeMessages(messages) {
  try {
    console.log("LLM Service: Start Summarize");
    const summaryResponse = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "Summarize the following conversation:" },
          ...messages,
        ],
        max_tokens: MAX_SUMMARY_TOKENS,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        httpsAgent,
        timeout: 15000,
      }
    );

    console.log("LLM Service: Done Summarize");
    return summaryResponse.data.choices[0].message.content;
  } catch (error) {
    console.error(
      "Error summarizing messages:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to summarize messages.");
  }
}

exports.LLM = async (inputText) => {
  try {
    // Prepare the new user message
    const newUserMessage = { role: "user", content: inputText };

    // Construct the prompt for the LLM API
    const promptMessages = [
      ...messageHistory,
      {
        role: "user",
        content: `Summarize past messages: ${messageHistory[0].content}\n and ONLY answer this please: ${inputText}`,
      },
    ];

    // Call OpenAI API for response
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: "gpt-4-turbo",
        messages: promptMessages,
        max_tokens: MAX_RESPONSE_TOKENS,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        httpsAgent, // Use persistent connection
        timeout: 60000,
      }
    );

    // Extract response content
    const gptResponse = response.data.choices[0].message.content;

    // Send response back to the user immediately
    console.log("Sending response to user:", gptResponse);

    // Update the message history
    messageHistory.push(newUserMessage);
    messageHistory.push({ role: "assistant", content: gptResponse });

    // Start summarization in the background
    (async () => {
      try {
        const historyToSummarize = messageHistory.slice(1); // Exclude system message
        const updatedSummary = await summarizeMessages(historyToSummarize);

        // Replace message history with the summary for future use
        messageHistory = [
          {
            role: "system",
            content: "Summarized conversation so far: " + updatedSummary,
          },
        ];

        console.log(
          "Updated Message History (Background Summary):",
          messageHistory
        );
      } catch (error) {
        console.error("Error during background summarization:", error.message);
      }
    })();

    return gptResponse;
  } catch (error) {
    console.error(
      "Error with OpenAI API:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to get response from GPT-4 Turbo");
  }
};
