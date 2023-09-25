const mongoose = require("mongoose");
const Achieve = require("../../model/Achieve");
const Term = require("../../model/Term");
const Card = require("../../model/Card");
const TickMark = require("../../model/TickMark");
const { shuffle } = require("../../util/shuffle");
const Rep = require("../../model/Rep");

const MAX_REP = 3;
const ARRAY_REP = [0, 30, 24 * 60];

const Pagination = (req) => {
  let limit = Number(req.query.limit) * 1 || 10;

  return { limit };
};

const TestController = {
  getTest: async (req, res, next) => {
    const { slug } = req.params;
    const { limit } = Pagination(req);
    const { user } = req.query;
    try {
      let terms;
      const card = await Card.findOne({ slug: slug });
      if (user) {
        const ticked = await TickMark.find(
          {
            $and: [
              { card: { $eq: mongoose.Types.ObjectId(card._id) } },
              { isTest: { $in: [user] } },
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
            { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
            { _id: { $nin: tickedId } },
          ],
        }).limit(limit);
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
          answer: [] || "",
          _id: "",
          card: "",
          type: 1,
          l: 0,
        };
        ques.type = Math.ceil(Math.random() * 3);
        ques._id = arrCards[i]._id;
        ques.card = arrCards[i].cardId;
        if (ques.type === 1) {
          ques.prompt = arrCards[i].prompt;
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
        } else if (ques.type === 2) {
          ques.prompt = arrCards[i].prompt;
          ques.answer = arrCards[i].answer;
          ques.l = arrCards[i].prompt.length;
        } else {
          ques.answer = arrCards[i].answer;
          ques.l = arrCards[i].prompt.length;
        }
        newQuestion.push(ques);
      }
      shuffle(newQuestion);
      res.status(200).json({ question: newQuestion });
    } catch (err) {
      next(err);
    }
  },
  updateMardTest: async (term, card, user, next) => {
    try {
      if (user) {
        const termTick = await TickMark.findOne({ term });
        if (termTick) {
          if (!termTick.isTest.includes(user)) {
            await termTick.updateOne({ $push: { isTest: user } });
          }
        } else {
          const tickMark = new TickMark({
            term,
            card,
            isTest: [user],
          });
          await tickMark.save();
        }
        const achieve = await Achieve.findOne({ user });
        await achieve.updateOne({ $inc: { achieveTest: 1 } });
      }
    } catch (err) {
      next(err);
    }
  },
  getMarkTest: async (req, res, next) => {
    const quesArr = req.body.ques;
    let responArr = [];
    try {
      const { user } = req.body;
      for (const item of quesArr) {
        let respon = {
          check: false,
          correctAnswer: "",
          wrongAnswer: "",
        };
        let item2 = await Term.findOne({ _id: item._id });
        if (item.type === "learn" || item.type === 1) {
          if (item2.answer.toLowerCase() === item.answer.toLowerCase()) {
            if (user) {
              TestController.handleRep(item2._id, item.card, user, next);
            }
            respon.check = true;
            respon.correctAnswer = item2.answer;
          } else {
            respon.check = false;
            respon.correctAnswer = item2.answer;
            respon.wrongAnswer = item.answer;
          }
        } else {
          if (
            item2.prompt.toLowerCase().trim() ===
            item.answer.toLowerCase().trim()
          ) {
            if (user) {
              TestController.handleRep(item2._id, item.card, user, next);
            }
            respon.check = true;
            respon.correctAnswer = item.answer;
          } else {
            respon.check = false;
            respon.correctAnswer = item2.prompt;
            respon.wrongAnswer = item.answer;
          }
        }
        responArr.push(respon);
      }
      return res.status(200).json(responArr);
    } catch (err) {
      next(err);
    }
  },
  handleRep: async (term, card, user, next) => {
    try {
      if (!user) {
        return;
      }
      const rep = await Rep.findOne({ term: mongoose.Types.ObjectId(term) });
      if (!rep) {
        const newRep = new Rep({
          term,
          status: 1,
          user,
          card,
          type: "test",
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
          TestController.updateMardTest(term, card, user, next);
        }
      }
    } catch (error) {
      next(error);
    }
  },
  getSpaceRepTest: async (req, res, next) => {
    const { limit } = Pagination(req);
    const user = req.user._id;
    try {
      if (!user) return;
      const currentDate = new Date();
      const reps = await Rep.find({
        $and: [{ dateRep: { $lt: currentDate } }, { user: user }],
      }).limit(limit);
      let repsId = [];
      for (const item of reps) {
        repsId.push(item.term);
      }
      const terms = await Term.find({ _id: { $in: repsId } });

      const arrCards = terms;
      let length = arrCards.length;
      let newQuestion = [];

      for (let i = 0; i < length; i++) {
        let ques = {
          prompt: "",
          answer: [] || "",
          _id: "",
          card: "",
          type: reps[i].type,
          l: 0,
        };
        ques._id = arrCards[i]._id;
        ques.card = arrCards[i].cardId;
        if (ques.type === "learn") {
          ques.prompt = arrCards[i].prompt;
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
                _id: { $ne: arrCards[i]._id },
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
        } else if (ques.type === "listen") {
          ques.prompt = arrCards[i].prompt;
          ques.answer = arrCards[i].answer;
          ques.l = arrCards[i].prompt.length;
        } else if (ques.type === "write") {
          ques.answer = arrCards[i].answer;
          ques.l = arrCards[i].prompt.length;
        }
        newQuestion.push(ques);
      }
      shuffle(newQuestion);
      res.status(200).json({ question: newQuestion });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = TestController;
