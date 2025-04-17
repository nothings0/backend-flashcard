const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    slug: {
      type: String,
      default: "",
    },
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
    },
    share: {
      type: Boolean,
      required: true,
      default: true,
    },
    views: {
      type: Number,
      default: 5,
    },
    background: {
      type: String,
      default: "",
    },
    rate: {
      total: {
        type: Number,
        default: 0,
      },
      quantity: {
        type: Number,
        default: 0,
      },
    },
    type: {
      type: String,
      default: "REGULAR",
    },
    password: {
      type: String,
      default: "",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Card", CardSchema);
