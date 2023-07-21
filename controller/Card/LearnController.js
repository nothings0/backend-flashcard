const TickMark = require("../../model/TickMark");
const Term = require("../../model/Term");
const Rep = require("../../model/Rep");
const { shuffle } = require("../../util/shuffle");
const mongoose = require("mongoose");
const Achieve = require("../../model/Achieve");
const Card = require("../../model/Card");

const MAX_REP = 6;
const ARRAY_REP = [0, 7, 30, 24 * 60, 3 * 24 * 60, 7 * 24 * 60];

const Pagination = (req) => {
  let limit = Number(req.query.limit) * 1 || 10;

  return { limit };
};

const LearnController = {
  getLearn: async (req, res, next) => {
    const { slug } = req.params;
    const { user } = req.query;
    const { limit } = Pagination(req);
    try {
      let terms = [];
      const card = await Card.findOne({ slug: slug });
      if (user) {
        const currentDate = new Date();
        const termRepPromise = Promise.all([
          Rep.find({
            $and: [{ dateRep: { $lt: currentDate } }, { type: "learn" }],
          }).limit(limit),
          Rep.find({
            $and: [{ dateRep: { $gt: currentDate } }, { type: "learn" }],
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
      const arrCards = terms;
      let length = arrCards.length;
      let newQuestion = [];

      for (let i = 0; i < length; i++) {
        let ques = {
          prompt: "",
          answer: [],
          _id: "",
        };
        ques.prompt = arrCards[i].prompt;
        ques._id = arrCards[i]._id;
        let correctAnswer = {
          answerTxt: "",
          answerId: "",
        };
        correctAnswer.answerTxt = arrCards[i].answer;
        correctAnswer.answerId = arrCards[i]._id;
        ques.answer.push(correctAnswer);
        const terms2 = await Term.aggregate([
          {
            $match: {
              $and: [
                { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
                { _id: { $ne: arrCards[i]._id } },
              ],
            },
          },
          { $sample: { size: 3 } },
        ]);
        for (let j = 0; j < 3; j++) {
          let answerItem = {
            answerTxt: "",
            answerId: "",
          };
          answerItem.answerTxt = terms2[j].answer;
          answerItem.answerId = terms2[j]._id;
          ques.answer.push(answerItem);
        }
        shuffle(ques.answer);
        newQuestion.push(ques);
      }
      shuffle(newQuestion);
      res.status(200).json({ question: newQuestion });
    } catch (err) {
      next(err);
    }
  },
  updateMardLearn: async (term, card, user, next) => {
    try {
      const termTick = await TickMark.findOne({
        term: mongoose.Types.ObjectId(term),
      });
      if (termTick) {
        if (!termTick.isLearn.includes(user)) {
          await termTick.updateOne({ $push: { isLearn: user } });
        }
      } else {
        const tickMark = new TickMark({
          card,
          term,
          isLearn: [user],
        });
        await tickMark.save();
      }
      const achieve = await Achieve.findOne({
        user: mongoose.Types.ObjectId(user),
      });
      await achieve.updateOne({ $inc: { achieveLearn: 1 } });
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
        $and: [{ term: mongoose.Types.ObjectId(term) }, { type: "learn" }],
      });
      if (!rep) {
        // console.log("vao day");
        const newRep = new Rep({
          term,
          status: 1,
          user,
          card,
          type: "learn",
        });
        await newRep.save();
      } else {
        // console.log("vao day 2");
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
          LearnController.updateMardLearn(term, card, user, next);
        }
      }
    } catch (error) {
      next(error);
    }
  },
  getMarkLearn: async (req, res, next) => {
    const { slug } = req.params;
    const { answer, id } = req.body.ques;

    let respon = {
      check: false,
      correctAnswer: "",
      wrongAnswer: "",
    };
    try {
      const card = await Card.findOne({ slug });
      const item = await Term.findOne({ _id: id });
      if (item.answer.toLowerCase() === answer.toLowerCase()) {
        const { user } = req.body;
        LearnController.handleRep(item._id, card._id, user, next);
        respon.check = true;
        respon.correctAnswer = answer;
      } else {
        respon.check = false;
        respon.correctAnswer = item.answer;
        respon.wrongAnswer = answer;
      }
      return res.status(200).json(respon);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = LearnController;
