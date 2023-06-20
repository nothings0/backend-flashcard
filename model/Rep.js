const mongoose = require("mongoose");

const RepSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    term: {
      type: mongoose.Types.ObjectId,
      ref: "Term",
    },
    card: {
      type: mongoose.Types.ObjectId,
      ref: "Card",
    },
    status: {
      type: Number,
      required: true,
      default: 1,
    },
    dateRep: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 7 * 60 * 1000); // Adding 7 minutes in milliseconds
      },
    },
    type: {
      type: String,
      default: "learn",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rep", RepSchema);
