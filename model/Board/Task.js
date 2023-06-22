const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    time: {
      type: Date,
      default: new Date(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
