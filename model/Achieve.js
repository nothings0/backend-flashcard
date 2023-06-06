const mongoose = require('mongoose')

const AchieveSchema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    },
    target: {
        type : Number , default : 100 
    },
    achieveLearn: { 
        type : Number , default : 0 
    },
    achieveTest: { 
        type : Number , default : 0 
    },
    achieveWrite: { 
        type : Number , default : 0 
    },
    achieveListen: { 
        type : Number , default : 0 
    }
}, {timestamps: false})

module.exports = mongoose.model("Achieve", AchieveSchema)