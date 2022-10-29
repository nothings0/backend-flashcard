const mongoose = require('mongoose')

const BoardSchema = new mongoose.Schema({
    title: {
        type: String,
        default: "Sắp xếp thời gian học tập"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cardOrder: {
        type: Array,
        default: []
    }
}, {timestamps: false})

module.exports = mongoose.model("Board", BoardSchema)