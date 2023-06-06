const Term = require("../../model/Term");
const TickMark = require("../../model/TickMark");
const mongoose = require("mongoose");
const Achieve = require("../../model/Achieve");
const { calculateAccuracy } = require("../../util/supportMark");
const Pagination = (req) => {
  let limit = Number(req.query.limit) * 1 || 10;

  return { limit };
};

const ListenController = {
  getListen: async (req, res, next) => {
    const { user } = req.query;
    const { cardId } = req.params;
    const { limit } = Pagination(req);
    try {
      let terms = [];
      if (user) {
        const ticked = await TickMark.find(
          {
            $and: [
              { card: { $eq: mongoose.Types.ObjectId(cardId) } },
              { isListen: { $in: [user] } },
            ],
          },
          { term: 1, _id: 0 }
        );
        let tickedId = [];
        for (const item of ticked) {
          tickedId.push(item.term);
        }
        terms = await Term.find({
          $and: [
            { cardId: { $eq: mongoose.Types.ObjectId(cardId) } },
            { _id: { $nin: tickedId } },
          ],
        }).limit(limit);
      } else {
        terms = await Term.aggregate([
          { $match: { cardId: { $eq: mongoose.Types.ObjectId(cardId) } } },
          { $sample: { size: limit } },
        ]);
      }

      let newQuestion = [];

      for (const term of terms) {
        let ques = {
          prompt: term.prompt,
          answer: term.answer,
          _id: term._id,
        };
        newQuestion.push(ques);
      }
      res.status(200).json({ question: newQuestion });
    } catch (err) {
      next(err);
    }
  },
  updateMardListen: async (term, card, user, next) => {
    try {
      if (user) {
        const termTick = await TickMark.findOne({ term });
        if (termTick) {
          if (!termTick.isListen.includes(user)) {
            await termTick.updateOne({ $push: { isListen: user } });
          }
        } else {
          const tickMark = new TickMark({
            term,
            card,
            isListen: [user],
          });
          await tickMark.save();
        }
        const achieve = await Achieve.findOne({ user });
        await achieve.updateOne({ $inc: { achieveListen: 1 } });
      }
    } catch (err) {
      next(err);
    }
  },
  getMarkListen: async (req, res, next) => {
    const { cardId } = req.params;
    const { answer, id } = req.body.ques;
    let respon = {
      check: false,
      correctAnswer: "",
      wrongAnswer: "",
      percent: 0,
    };
    try {
      const item = await Term.findOne({ _id: id });
      const percent = calculateAccuracy(item.prompt, answer);
      if (percent > 95.0) {
        const { user } = req.body;
        ListenController.updateMardListen(item._id, cardId, user, next);
        respon.check = true;
        respon.correctAnswer = item.prompt;
        respon.percent = percent;
        respon.wrongAnswer = answer;
      } else {
        respon.check = false;
        respon.correctAnswer = item.prompt;
        respon.wrongAnswer = answer;
        respon.percent = percent;
      }
      return res.status(200).json(respon);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ListenController;
