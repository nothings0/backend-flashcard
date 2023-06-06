const mongoose = require('mongoose');
const Achieve = require('../../model/Achieve');
const Term = require('../../model/Term')
const TickMark = require('../../model/TickMark');
const {shuffle} = require('../../util/shuffle')

const Pagination = (req) => {
    let limit = Number(req.query.limit) * 1 || 10;
  
    return { limit }
}

const TestController = {
    getTest: async(req, res, next) => {
        const { cardId } = req.params
        const { limit } = Pagination(req)
        const {user} = req.query
        try {
            let terms
            if(user){
                const ticked = await TickMark.find({
                    $and: [
                        {card: {$eq: mongoose.Types.ObjectId(cardId)}},
                        {isTest: {$in: [user]}}
                    ]
                }, {term: 1, _id: 0})
                let tickedId = []
                for (const item of ticked) {
                    tickedId.push(item.term)
                }
                terms = await Term.find({
                    $and: [
                        {cardId: {$eq: mongoose.Types.ObjectId(cardId)}},
                        {_id: {$nin: tickedId}}
                    ]
                }).limit(limit)
            }else{
                terms = await Term.aggregate([
                    { $match: {cardId: {$eq: mongoose.Types.ObjectId(cardId)}}}
                    ,{ $sample: { size: limit } }
                ])
            }
            
            const arrCards = terms
            let length = arrCards.length
            let newQuestion = []
            
            for(let i = 0; i < length; i++){
                    let ques = {
                            prompt: '',
                            answer: [] || "",
                            _id: "",
                            type: 1
                        }
                        ques.type = Math.ceil(Math.random() * 3)
                        ques._id = arrCards[i]._id
                if(ques.type === 1){
                    ques.prompt = arrCards[i].prompt
                    let correctAnswer = {
                        answerTxt: "",
                        answerId: ""
                    }
                    correctAnswer.answerTxt = arrCards[i].answer
                    correctAnswer.answerId = arrCards[i]._id
                    ques.answer.push(correctAnswer)
                    const terms2 = await Term.aggregate([
                        {$match: {$and: [
                            {cardId: {$eq: mongoose.Types.ObjectId(cardId)}},
                            {_id: {$ne: arrCards[i]._id}}
                        ]}},
                        { $sample: { size: 3} }
                    ])
                    for(let j = 0; j < 3; j++){
                        let answerItem = {
                            answerTxt: "",
                            answerId: ""
                        }
                        answerItem.answerTxt = terms2[j].answer
                        answerItem.answerId = terms2[j]._id
                        ques.answer.push(answerItem)
                    }
                    shuffle(ques.answer)
                }else if(ques.type === 2){
                    ques.prompt = arrCards[i].prompt
                }else{
                    ques.answer = arrCards[i].answer
                }
                newQuestion.push(ques)
            }
            shuffle(newQuestion)
            res.status(200).json({question: newQuestion})
        } catch (err) {
            next(err)
        }
    },
    updateMardTest: async(term,card, user, next) => {
        try {
            if(user){
                const termTick = await TickMark.findOne({term})
                if(termTick){
                    if (!termTick.isTest.includes(user)) {
                        await termTick.updateOne({$push: {isTest: user}})
                    }
                }else{
                    const tickMark = new TickMark({
                        term,
                        card,
                        isTest: [user]
                    })
                    await tickMark.save()
                }
                const achieve = await Achieve.findOne({user})
                await achieve.updateOne({$inc: {achieveTest: 1}})
            }
        } catch (err) {
            next(err)
        }
    },
    getMarkTest: async(req, res, next) => {
        const {cardId} = req.params
        const quesArr = req.body.ques
        let responArr = []
        try {
            const terms = await Term.find({ cardId })
            const arrCards = terms
            const {user} = req.body
            quesArr.forEach(item => {
                let respon = {
                    check: false,
                    correctAnswer: "",
                    wrongAnswer: ""
                }
                let item2 = arrCards.find(e => e._id.valueOf() == item._id)
                if(item.type === 1){
                    if(item2.answer.toLowerCase() === item.answer.toLowerCase()){
                        if(user){
                            TestController.updateMardTest(item2._id, cardId, user, next)
                        }
                        respon.check = true
                        respon.correctAnswer = item2.answer
                    }else{
                        respon.check = false
                        respon.correctAnswer = item2.answer
                        respon.wrongAnswer = item.answer
                    }
                }else{
                    if(item2.prompt.toLowerCase().trim() === item.answer.toLowerCase().trim()){
                        if(user){
                            TestController.updateMardTest(item2._id, cardId, user, next)
                        }
                        respon.check = true
                        respon.correctAnswer = item.answer
                    }else{
                        respon.check = false
                        respon.correctAnswer = item2.prompt
                        respon.wrongAnswer = item.answer
                    }
                }
                responArr.push(respon)
            });
            
            return res.status(200).json(responArr)
        } catch (err) {
            next(err)
        }
    },
}

module.exports = TestController