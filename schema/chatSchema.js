const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// TO DO
// Think of Session Id

const chatSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // Reference to the user interacting with the bot
    ref: "User", // Assuming there's a 'User' model
  },
  messages: [
    {
      requestText: {
        type: String,
        required: true, // Text the user sent
      },
      responseText: {
        type: String,
        required: true, // The bot's response
      },
      voiceId: {
        type: String,
      },
      character: {
        type: String,
      },
      timestamp: {
        type: Date,
        default: Date.now, // When the message was sent/received
      },
    },
  ],
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
