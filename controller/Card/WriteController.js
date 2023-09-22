const mongoose = require("mongoose");
const Achieve = require("../../model/Achieve");
const Term = require("../../model/Term");
const TickMark = require("../../model/TickMark");
const {
  calculateAccuracy,
  generateWordHint,
} = require("../../util/supportMark");
const Rep = require("../../model/Rep");
const Card = require("../../model/Card");

const MAX_REP = 5;
const ARRAY_REP = [0, 7, 24 * 60, 3 * 24 * 60, 7 * 24 * 60];

const Pagination = (req) => {
  let limit = Number(req.query.limit) * 1 || 10;

  return { limit };
};

const WriteController = {
  getWrite: async (req, res, next) => {
    const { slug } = req.params;
    const { user } = req.query;
    const { limit } = Pagination(req);
    try {
      const card = await Card.findOne({ slug: slug });
      let terms = [];
      if (user) {
        const currentDate = new Date();
        const termRepPromise = Promise.all([
          Rep.find({
            $and: [{ dateRep: { $lt: currentDate } }, { type: "write" }],
          }).limit(limit),
          Rep.find({
            $and: [{ dateRep: { $gt: currentDate } }, { type: "write" }],
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
          answer: term.answer,
          _id: term._id,
          l: term.prompt.length,
        };
        newQuestion.push(ques);
      }
      res.status(200).json({ question: newQuestion });
    } catch (err) {
      next(err);
    }
  },
  updateMardWrite: async (term, card, user, next) => {
    try {
      if (user) {
        const termTick = await TickMark.findOne({ term });
        if (termTick) {
          if (!termTick.isWrite.includes(user)) {
            await termTick.updateOne({ $push: { isWrite: user } });
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
        await achieve.updateOne({ $inc: { achieveWrite: 1 } });
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
        $and: [{ term: mongoose.Types.ObjectId(term) }, { type: "write" }],
      });
      if (!rep) {
        // console.log("vao day");
        const newRep = new Rep({
          term,
          status: 1,
          user,
          type: "write",
          card,
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
          WriteController.updateMardLearn(term, card, user, next);
        }
      }
    } catch (error) {
      next(error);
    }
  },
  getMarkWrite: async (req, res, next) => {
    const { slug } = req.params;
    const { answer, id } = req.body.ques;
    let respon = {
      check: false,
      correctAnswer: "",
      wrongAnswer: "",
      percent: 0,
      actions: {},
    };
    try {
      const card = await Card.findOne({ slug });
      const item = await Term.findOne({ _id: id });
      const percent = calculateAccuracy(item.prompt, answer);
      if (percent > 95.0) {
        const { user } = req.body;

        WriteController.handleRep(item._id, card._id, user, next);
        respon.check = true;
      } else {
        respon.check = false;
        const merge = matchStrings(item.prompt, answer);
        respon.actions = {
          str: merge,
          falsePos: findNonSubsequencePositions(item.prompt, merge),
        };
      }
      respon.correctAnswer = item.prompt;
      respon.wrongAnswer = answer;
      respon.percent = percent;
      return res.status(200).json(respon);
    } catch (err) {
      next(err);
    }
  },
  suggest: async (req, res, next) => {
    try {
      const { id } = req.query;
      const item = await Term.findOne({ _id: id });
      const word = generateWordHint(item.prompt);
      return res.status(200).json({ suggest: word });
    } catch (error) {
      next(error);
    }
  },
};
function matchStrings(s1, s2) {
  let result = "";

  let i = 0,
    j = 0;

  while (i < s1.length || j < s2.length) {
    if (i < s1.length && j < s2.length && s1[i] === s2[j]) {
      result += s1[i];
      i++;
      j++;
    } else if (
      i < s1.length &&
      (j >= s2.length || s1.length - i > s2.length - j)
    ) {
      result += s1[i];
      i++;
    } else {
      result += s2[j];
      j++;
    }
  }

  return result;
}
// function return pos that sub not in str = remove this pos of str to sub
function findNonSubsequencePositions(sub, str) {
  let foundPositions = [];
  let nonMatchingPositions = [];
  let i = 0;
  let j = 0;

  while (i < sub.length && j < str.length) {
    if (sub[i] === str[j]) {
      foundPositions.push(j);
      i++;
    }
    j++;
  }

  for (let k = 0; k < str.length; k++) {
    if (!foundPositions.includes(k)) {
      nonMatchingPositions.push(k);
    }
  }

  return nonMatchingPositions;
}

module.exports = WriteController;
