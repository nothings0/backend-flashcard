const Term = require("../../model/Term");
const TickMark = require("../../model/TickMark");
const mongoose = require("mongoose");
const Achieve = require("../../model/Achieve");
const { calculateAccuracy } = require("../../util/supportMark");
const Rep = require("../../model/Rep");
const Card = require("../../model/Card");

const MAX_REP = 5;
const ARRAY_REP = [0, 7, 24 * 60, 3 * 24 * 60, 7 * 24 * 60];

const Pagination = (req) => {
  let limit = Number(req.query.limit) * 1 || 10;

  return { limit };
};

const ListenController = {
  getListen: async (req, res, next) => {
    const { user } = req.query;
    const { slug } = req.params;
    const { limit } = Pagination(req);
    try {
      let terms = [];
      const card = await Card.findOne({ slug });
      if (user) {
        const currentDate = new Date();
        const termRepPromise = Promise.all([
          Rep.find({
            $and: [{ dateRep: { $lt: currentDate } }, { type: "listen" }],
          }).limit(limit),
          Rep.find({
            $and: [{ dateRep: { $gt: currentDate } }, { type: "listen" }],
          }),
        ]);
        const [termRep, termRepNot] = await termRepPromise;
        let termRepId = [];
        for (const item of termRep) {
          termRepId.push(item.term);
        }
        const newTerms = await Term.find({
          $and: [
            { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
            { _id: { $in: termRepId } },
          ],
        });
        terms = newTerms;
        const termRepLength = newTerms.length;
        const newLimit = limit - termRepLength;
        if (newLimit > 0) {
          // tìm tất cả các term đã học xong
          const ticked = await TickMark.find(
            {
              $and: [
                { card: { $eq: mongoose.Types.ObjectId(card._id) } },
                { isLearn: { $in: [user] } },
              ],
            },
            { term: 1, _id: 0 }
          );
          let tickedId = [];
          for (const item of termRepNot) {
            tickedId.push(item.term);
          }
          for (const item of ticked) {
            tickedId.push(item.term);
          }
          const tickedTerms = await Term.find({
            $and: [
              { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
              { _id: { $nin: tickedId } },
            ],
          }).limit(newLimit);
          const arrTerms = [...terms, ...tickedTerms];
          terms = arrTerms;
        }
      } else {
        terms = await Term.aggregate([
          { $match: { cardId: { $eq: mongoose.Types.ObjectId(card._id) } } },
          { $sample: { size: limit } },
        ]);
      }

      let newQuestion = [];

      for (const term of terms) {
        let ques = {
          prompt: term.prompt,
          answer: term.answer,
          l: term.prompt.length,
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
  handleRep: async (term, card, user, next) => {
    try {
      if (!user) {
        return;
      }
      const rep = await Rep.findOne({
        $and: [{ term: mongoose.Types.ObjectId(term) }, { type: "listen" }],
      });
      if (!rep) {
        const newRep = new Rep({
          term,
          status: 1,
          user,
          type: "listen",
          card,
        });
        await newRep.save();
      } else {
        const newStatus = rep.status + 1;
        if (newStatus < MAX_REP) {
          const newDateRep = new Date(
            Date.now() + ARRAY_REP[newStatus] * 60 * 1000
          );
          await rep.updateOne({
            $set: { status: newStatus, dateRep: newDateRep },
          });
        } else {
          await rep.deleteOne();
          ListenController.updateMardLearn(term, card, user, next);
        }
      }
    } catch (error) {
      next(error);
    }
  },
  getMarkListen: async (req, res, next) => {
    const { slug } = req.params;
    const { answer, id } = req.body.ques;
    let respon = {
      check: false,
      correctAnswer: "",
      wrongAnswer: "",
      percent: 0,
    };
    try {
      const card = await Card.findOne({ slug });
      const item = await Term.findOne({ _id: id });
      const percent = calculateAccuracy(item.prompt, answer);
      if (percent > 95.0) {
        const { user } = req.body;
        ListenController.handleRep(item._id, card._id, user, next);
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
