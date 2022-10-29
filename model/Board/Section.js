const mongoose = require('mongoose')

const SectionSchema = new mongoose.Schema({
    board: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Board'
    },
    title: {
        type: String,
        default: ''
    },
    taskOrder: {
        type: Array,
        default: []
    }
}, {timestamps: false})

module.exports = mongoose.model("Section", SectionSchema)