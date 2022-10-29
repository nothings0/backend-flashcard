const mongoose = require('mongoose')

const CategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please add your category"],
        trim: true,
        unique: true,
        maxLength: [50, "Name is up to 50 chars long."]
    }
}, {timestamps: false})

module.exports = mongoose.model("Category", CategorySchema)