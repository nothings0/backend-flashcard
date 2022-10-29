const mongoose = require('mongoose')

const TaskSchema = new mongoose.Schema({
    section: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    title: {
        type: String,
        default: ''
    }
}, {timestamps: true})
  
module.exports = mongoose.model('Task', TaskSchema)