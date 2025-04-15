const mongoose = require('mongoose')

const NotificationSchema = new mongoose.Schema({
    user: {
        type: String,
        default: ''
    },
    isRead: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    url: {
        type: String,
        default: ''
    },
}, {timestamps: true})

module.exports = mongoose.model("Notification", NotificationSchema)