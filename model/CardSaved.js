const mongoose = require('mongoose')

const CardSaved = new mongoose.Schema({
    card: {
        type: mongoose.Types.ObjectId,
        ref: "Card"
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    },
}, {timestamps: false})

module.exports = mongoose.model("cardSaved", CardSaved)