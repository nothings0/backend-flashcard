const mongoose = require("mongoose");
const Term = require("../../model/Term");
const TickMark = require("../../model/TickMark");
const { shuffle } = require("../../util/shuffle");
const Card = require("../../model/Card");

const Pagination = (req) => {
  let limit = Number(req.query.limit) * 1 || 10;

  return { limit };
};

const MatchCardController = {
  getMatchCard: async (req, res, next) => {
    const { slug } = req.params;
    const { user } = req.query;
    const { limit } = Pagination(req);
    try {
      let termArr = [];
      const card = await Card.findOne({ slug: slug });
      if (user) {
        const ticked = await TickMark.find(
          {
            $and: [
              { card: { $eq: mongoose.Types.ObjectId(card._id) } },
              { isMatch: { $in: [user] } },
            ],
          },
          { term: 1, _id: 0 }
        );
        let tickedId = [];
        for (const item of ticked) {
          tickedId.push(item.term);
        }
        termArr = await Term.find(
          {
            $and: [
              { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
              { _id: { $nin: tickedId } },
            ],
          },
          { answer: 1, prompt: 1 }
        ).limit(limit);
      } else {
        termArr = await Term.aggregate([
          { $match: { cardId: { $eq: mongoose.Types.ObjectId(card._id) } } },
          { $sample: { size: limit } },
        ]);
      }

      let newQuestion = [];
      for (const item of termArr) {
        let itemAnswer = {
          txt: "",
          id: "",
        };
        let itemPrompt = {
          txt: "",
          id: "",
        };
        itemAnswer.txt = item.answer;
        itemPrompt.txt = item.prompt;
        itemAnswer.id = item._id;
        itemPrompt.id = item._id;
        newQuestion.push(itemAnswer, itemPrompt);
      }
      shuffle(newQuestion);
      res.status(200).json({ terms: newQuestion });
    } catch (err) {
      next(err);
    }
  },
  updateMatchCard: async (req, res, next) => {
    const { user, terms } = req.body;
    const { slug } = req.params;
    try {
      const card = await Card.findOne({ slug });
      if (user) {
        for (const item of terms) {
          const termTick = await TickMark.findOne({ term: item.id });
          if (termTick) {
            if (!termTick.isMatch.includes(user)) {
              await termTick.updateOne({ $push: { isMatch: user } });
            }
          } else {
            const tickMark = new TickMark({
              card: card._id,
              term: item.id,
              isMatch: [user],
            });
            await tickMark.save();
          }
        }
        return res
          .status(200)
          .json({ msg: "update state match card success!" });
      }
    } catch (err) {
      next(err);
    }
  },
  updateAndGet: async (req, res, next) => {
    const { user, terms } = req.body;
    const { slug } = req.params;
    const { limit } = Pagination(req);
    try {
      let termArr;
      const card = await Card.findOne({ slug });
      if (user) {
        for (const item of terms) {
          const termTick = await TickMark.findOne({ term: item.id });
          if (termTick) {
            if (!termTick.isMatch.includes(user)) {
              await termTick.updateOne({ $push: { isMatch: user } });
            }
          } else {
            const tickMark = new TickMark({
              card: card._id,
              term: item.id,
              isMatch: [user],
            });
            await tickMark.save();
          }
        }
        const ticked = await TickMark.find(
          {
            $and: [
              { card: { $eq: mongoose.Types.ObjectId(card._id) } },
              { isMatch: { $in: [user] } },
            ],
          },
          { term: 1, _id: 0 }
        );
        let tickedId = [];
        for (const item of ticked) {
          tickedId.push(item.term);
        }
        termArr = await Term.find(
          {
            $and: [
              { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
              { _id: { $nin: tickedId } },
            ],
          },
          { answer: 1, prompt: 1 }
        ).limit(limit);
      } else {
        termArr = await Term.aggregate([{ $sample: { size: limit } }]);
      }
      let newQuestion = [];
      for (const item of termArr) {
        let itemAnswer = {
          txt: "",
          id: "",
        };
        let itemPrompt = {
          txt: "",
          id: "",
        };
        itemAnswer.txt = item.answer;
        itemPrompt.txt = item.prompt;
        itemAnswer.id = item._id;
        itemPrompt.id = item._id;
        newQuestion.push(itemAnswer, itemPrompt);
      }
      shuffle(newQuestion);
      res.status(200).json({ terms: newQuestion });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = MatchCardController;
