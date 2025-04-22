const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    current: {
      type: Number,
      default: 0
    },
    members: [
      {
        id: String,
        mark: Number,
        name: String,
      },
    ],
    status: {
      type: String,
      required: true,
      default: "waiting",
    },
    questions: [
      {
        prompt: String,
        learn: [
          {
            answerTxt: String,
            answerId: String,
          }
        ],
        id: String,
        startTime: Date
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("room", RoomSchema);
