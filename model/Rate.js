const mongoose = require('mongoose')

const RateSchema = new mongoose.Schema({
    card: {
        type: mongoose.Types.ObjectId,
        ref: "Card"
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    },
    rate: {
        type: Number,
        default: 1,
    },
}, {timestamps: true})

module.exports = mongoose.model("Rate", RateSchema)