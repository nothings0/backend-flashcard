const Term = require('../../model/Term')

const LearnController = {
    getFlashCard: async(req, res, next) => {
        const { cardId } = req.params
        try {
            const terms = await Term.find({ cardId })
            res.status(200).json({ terms })
        } catch (err) {
            next(err)
        }
    }
}

module.exports = LearnController