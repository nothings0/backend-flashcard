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
    content: {
        type: String,
        required: true
    }
}, {timestamps: true})

module.exports = mongoose.model("Notification", NotificationSchema)