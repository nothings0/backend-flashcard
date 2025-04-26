const mongoose = require('mongoose')

const Pricing = new mongoose.Schema({
    title: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    type: {
        type: String,
        enum: ['MONTHLY', 'YEARLY'],
        default: 'MONTHLY'
    },
    price: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    }
}, {timestamps: false})

module.exports = mongoose.model("Pricing", Pricing)