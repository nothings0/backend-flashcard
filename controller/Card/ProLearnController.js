const Term = require("../../model/Term");
const TickMark = require("../../model/TickMark");
const mongoose = require("mongoose");
const Card = require("../../model/Card");
const { shuffle } = require("../../util/shuffle");

const ProLearnController = {
  getPro: async (req, res, next) => {
    const { slug } = req.params;
    const user = req.user._id;
    try {
      let terms;
      const card = await Card.findOne({ slug });
      if (user) {
        const ticked = await TickMark.find({
          card: { $eq: mongoose.Types.ObjectId(card._id) },
        });
        let tickedId = [];
        for (const item of ticked) {
          tickedId.push(item.term);
        }
        terms = await Term.aggregate([
          {
            $match: {
              $and: [
                { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
                { _id: { $nin: tickedId } },
              ],
            },
          },
          { $sample: { size: 1 } },
        ]);
      } else {
        terms = await Term.aggregate([
          { $match: { cardId: { $eq: mongoose.Types.ObjectId(card._id) } } },
          { $sample: { size: 1 } },
        ]);
      }
      const term = terms[0];
      const audioLink = `https://dict.youdao.com/dictvoice?audio=${term.prompt}`;

      let ques = {
        term: {
          answer: term.answer,
          prompt: term.prompt,
          id: term._id,
        },
        audio: audioLink,
        learn: [],
        listen: {
          l: 0,
        },
      };
      let correctAnswer = {
        answerTxt: "",
        answerId: "",
      };
      correctAnswer.answerTxt = term.answer;
      correctAnswer.answerId = term._id;
      ques.learn.push(correctAnswer);
      const term2 = await Term.aggregate([
        {
          $match: {
            $and: [
              { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
              { _id: { $ne: term._id } },
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
        answerItem.answerTxt = term2[j].answer;
        answerItem.answerId = term2[j]._id;
        ques.learn.push(answerItem);
      }
      shuffle(ques.learn);
      ques.listen = {
        l: term.prompt.length,
      };

      res.status(200).json({ ques });
    } catch (err) {
      next(err);
    }
  },
  getQuiz: async (slug) => {
    try {
      let terms;
      const card = await Card.findOne({ slug });
      terms = await Term.aggregate([
        { $match: { cardId: { $eq: mongoose.Types.ObjectId(card._id) } } },
        { $sample: { size: 1 } },
      ]);
      const term = terms[0];

      let ques = {
        prompt: term.prompt,
        learn: [],
        id: term._id,
      };
      let correctAnswer = {
        answerTxt: "",
        answerId: "",
      };
      correctAnswer.answerTxt = term.answer;
      correctAnswer.answerId = term._id;
      ques.learn.push(correctAnswer);
      const term2 = await Term.aggregate([
        {
          $match: {
            $and: [
              { cardId: { $eq: mongoose.Types.ObjectId(card._id) } },
              { _id: { $ne: term._id } },
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
        answerItem.answerTxt = term2[j].answer;
        answerItem.answerId = term2[j]._id;
        ques.learn.push(answerItem);
      }
      shuffle(ques.learn);
      return ques;
    } catch (err) {
      console.log(err);
    }
  },
  getMark: async (answer, id) => {
    let respon = {
      check: false,
      correctAnswer: "",
      wrongAnswer: "",
    };
    try {
      // const item = await Term.findOne({ _id: id });
      if (answer === id) {
        respon.check = true;
        respon.correctAnswer = id;
      } else {
        respon.check = false;
        respon.correctAnswer = id;
        respon.wrongAnswer = answer;
      }
      return respon;
    } catch (err) {}
  },
};

module.exports = ProLearnController;
