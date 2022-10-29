const mongoose = require('mongoose')

const TichMarkSchema = new mongoose.Schema({
    term: {
        type: mongoose.Types.ObjectId,
        ref: "Term"
    },
    card: {
        type: mongoose.Types.ObjectId,
        ref: "Card"
    },
    isLearn: { 
        type : Array , default : [] 
    },
    isTest: { 
        type : Array , default : [] 
    },
    isWrite: { 
        type : Array , default : [] 
    },
    isListen: { 
        type : Array , default : [] 
    },
    isFlashCard: { 
        type : Array , default : [] 
    },
    isMatch: { 
        type : Array , default : [] 
    }
}, {timestamps: true})

module.exports = mongoose.model("TickMark", TichMarkSchema)