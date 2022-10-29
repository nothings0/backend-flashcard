const mongoose = require('mongoose')

const ContactData = new mongoose.Schema({
    title: {
        type: String
    },
    email: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, {timestamps: false})

module.exports = mongoose.model("contactData", ContactData)