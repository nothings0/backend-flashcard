const mongoose = require('mongoose')

const TermSchema = new mongoose.Schema({
    prompt: {
        type: String,
        default: ""
    },
    answer: {
        type: String,
        default: ""
    },
    cardId: {
        type: mongoose.Types.ObjectId,
        ref: "Card"
    },
    position: {
        type: Number
    }
}, {timestamps: false})

module.exports = mongoose.model("Term", TermSchema)