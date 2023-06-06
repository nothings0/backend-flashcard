const TickMark = require('../../model/TickMark')
const Term = require('../../model/Term');
const {shuffle} = require('../../util/shuffle');
const mongoose = require('mongoose');
const Achieve = require('../../model/Achieve');

const Pagination = (req) => {
    let limit = Number(req.query.limit) * 1 || 10;
  
    return { limit }
}

const LearnController = {
    getLearn: async(req, res, next) => {
        const {cardId} = req.params
        const {user} = req.query
        const { limit } = Pagination(req)
        try {
            let terms = []
            if(user){
                const ticked = await TickMark.find({
                    $and: [
                        {card: {$eq: mongoose.Types.ObjectId(cardId)}},
                        {isLearn: {$in: [user]}}
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
                    prompt: "",
                    answer: [],
                    _id: ""
                }
                ques.prompt = arrCards[i].prompt
                ques._id = arrCards[i]._id
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
                newQuestion.push(ques)
            }
            shuffle(newQuestion)
            res.status(200).json({question: newQuestion})
        } catch (err) {
            next(err)
        }
    },
    updateMardLearn: async(term, card, user, next) => {
        try {
            if(user){
                const termTick = await TickMark.findOne({term})
                if(termTick){
                    if (!termTick.isLearn.includes(user)) {
                        await termTick.updateOne({$push: {isLearn: user}})
                    }
                }else{
                    const tickMark = new TickMark({
                        card,
                        term,
                        isLearn: [user]
                    })
                    await tickMark.save()
                }
                const achieve = await Achieve.findOne({user})
                await achieve.updateOne({$inc: {achieveLearn: 1}})
            }
        } catch (err) {
            next(err)
        }
    },
    getMarkLearn: async(req, res, next) => {
        const {cardId} = req.params
        const {answer, id} = req.body.ques
        
        let respon = {
            check: false,
            correctAnswer: "",
            wrongAnswer: ""
        }
        try {
            const item = await Term.findOne({ _id: id })
            if(item.answer.toLowerCase() === answer.toLowerCase()){
                const {user} = req.body
                LearnController.updateMardLearn(item._id, cardId ,user, next)
                respon.check = true
                respon.correctAnswer = answer
            }else{
                respon.check = false
                respon.correctAnswer = item.answer
                respon.wrongAnswer = answer
            }
            return res.status(200).json(respon)
        } catch (err) {
            next(err)
        }
    },
}

module.exports = LearnController