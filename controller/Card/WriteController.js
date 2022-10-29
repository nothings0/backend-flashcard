const { mongoose } = require('mongoose');
const Achieve = require('../../model/Achieve');
const Term = require('../../model/Term')
const TickMark = require('../../model/TickMark')

const Pagination = (req) => {
    let limit = Number(req.query.limit) * 1 || 10;
  
    return { limit }
}

const WriteController = {
    getWrite: async(req, res, next) => {
        const {cardId} = req.params
        const {user} = req.query
        const { limit } = Pagination(req)
        try {
            const ticked = await TickMark.find({
                $and: [
                    {card: {$eq: mongoose.Types.ObjectId(cardId)}},
                    {isWrite: {$in: [user]}}
                ]
            }, {term: 1, _id: 0})
            let tickedId = []
            for (const item of ticked) {
                tickedId.push(item.term)
            }
            const terms = await Term.find({
                $and: [
                    {cardId: {$eq: mongoose.Types.ObjectId(cardId)}},
                    {_id: {$nin: tickedId}}
                ]
            }).limit(limit)
            
            let newQuestion = []
            for (const term of terms) {
                let ques = {
                    answer: term.answer,
                    _id: term._id
                }
                newQuestion.push(ques)
            }
            res.status(200).json({question: newQuestion})
        } catch (err) {
            next(err)
        }
    },
    updateMardWrite: async(term, card, user, next) => {
        try {
            if(user){
                const termTick = await TickMark.findOne({term})
                if(termTick){
                    if (!termTick.isWrite.includes(user)) {
                        await termTick.updateOne({$push: {isWrite: user}})
                    }
                }else{
                    const tickMark = new TickMark({
                        term,
                        card,
                        isListen: [user]
                    })
                    await tickMark.save()
                }
                const achieve = await Achieve.findOne({user})
                if(achieve){
                    await achieve.updateOne({$inc: {achieveWrite: 1}})
                }else{
                    const newAchieve = new Achieve({
                        user,
                        achieveWrite: 1
                    })
                    await newAchieve.save()
                }
            }
        } catch (err) {
            next(err)
        }
    },
    getMarkWrite: async(req, res, next) => {
        const {cardId} = req.params
        const { answer, id } = req.body.ques
        let respon = {
            check: false,
            correctAnswer: "",
            wrongAnswer: ""
        }
        try {
            const item = await Term.findOne({ _id: id })
            if(item.prompt.toLowerCase().trim() === answer.toLowerCase().trim()){
                const {user} = req.body
                WriteController.updateMardWrite(item._id, cardId, user, next)
                respon.check = true
                respon.correctAnswer = answer
            }else{
                respon.check = false
                respon.correctAnswer = item.prompt
                respon.wrongAnswer = answer
            }
            return res.status(200).json(respon)
        } catch (err) {
            next(err)
        }
    },
}

module.exports = WriteController