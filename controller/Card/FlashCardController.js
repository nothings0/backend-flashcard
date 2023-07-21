const Term = require("../../model/Term");
const Card = require("../../model/Card");

const LearnController = {
  getFlashCard: async (req, res, next) => {
    const { slug } = req.params;
    try {
      const card = await Card.findOne({ slug: slug });
      const terms = await Term.find({ cardId: card._id });
      res.status(200).json({ terms });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = LearnController;
