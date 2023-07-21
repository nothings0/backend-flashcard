const Term = require("../../model/Term");
const TickMark = require("../../model/TickMark");
const fetch = require("node-fetch");
const KEY = process.env.DICTIONARY_KEY;
const mongoose = require("mongoose");
const Card = require("../../model/Card");
const { shuffle } = require("../../util/shuffle");
const { translate } = require("@vitalets/google-translate-api");

const ProLearnController = {
  getPro: async (req, res, next) => {
    const { slug } = req.params;
    const user = req.user._id;
    const { keywords } = req.body;
    try {
      const result = await translate(keywords, { from: "en", to: "vi" });
      return res.json(result);
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
      const data = await fetch(
        `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${term.prompt}?key=${KEY}`
      );
      const data1 = await data.json();
      // try {
      //   return res.json(data1);
      // } catch (error) {
      //   console.log(error);
      // }
      return res.json(data1);
      const audio = data1[0].hwi.prs[0].sound.audio;
      const first = audio.charAt(0);
      const AUDIO_URL = `https://media.merriam-webster.com/audio/prons/en/us/wav/${first}/${audio}.wav`;

      function removeExtraCharacters(inputString) {
        const regex = /{[^}]*}|<\/?\w+>/g;
        return inputString.replace(regex, "");
      }

      let ques = {
        term: {
          answer: term.answer,
          prompt: term.prompt,
          id: term._id,
          mw: data1[0].hwi.prs[0].mw,
          fl: data1[0].fl,
          def: {
            pt: removeExtraCharacters(data1[0].def[0].sseq[0][0][1].dt[0][1]),
            an: removeExtraCharacters(
              data1[0].def[0].sseq[0][0][1].dt[1][1][0].t
            ),
          },
        },
        audio: AUDIO_URL,
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
};

module.exports = ProLearnController;
