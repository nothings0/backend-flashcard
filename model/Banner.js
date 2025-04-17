const mongoose = require('mongoose')

const Banner = new mongoose.Schema({
    title: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    img: {
        type: String,
        default: "",
        required: true
    },
}, {timestamps: true})

module.exports = mongoose.model("Banner", Banner)