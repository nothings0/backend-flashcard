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
  },
  { timestamps: true }
);

module.exports = mongoose.model("room", RoomSchema);
