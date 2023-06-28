const Card = require("../model/Card");
const User = require("../model/User");
const Term = require("../model/Term");
const Rate = require("../model/Rate");
const CardSaved = require("../model/CardSaved");
const fetch = require("node-fetch");
// const {shuffle} = require('../util/shuffle')

const { GraphQLClient, gql } = require("graphql-request");

const Pagination = (req) => {
  let page = Number(req.query.page) * 1 || 1;
  let limit = Number(req.query.limit) * 1 || 4;
  let skip = (page - 1) * limit || 0;

  return { page, limit, skip };
};

const CardController = {
  createCard: async (req, res, next) => {
    try {
      const { title, description, share, background, term } = req.body;
      const userId = req.user._id;
      CardController.handleCreate(
        title,
        description,
        share,
        background,
        term,
        userId,
        next
      );
      res.status(200).json({
        type: "success",
        des: "Tạo card thành công",
      });
    } catch (err) {
      next(err);
    }
  },
  handleCreate: async (
    title,
    description,
    share,
    background,
    term,
    userId,
    next
  ) => {
    try {
      const newCard = new Card({
        title,
        description,
        share,
        background,
        user: userId,
      });
      await newCard.save();
      let termCount = await Term.find({ cardId: newCard._id }).count();
      let terms = [];
      for (let i = 0; i < term.length; i++) {
        const termItem = {
          prompt: term[i].prompt,
          answer: term[i].answer,
          cardId: newCard._id,
          position: termCount > 0 ? termCount : 0,
        };
        terms.push(termItem);
        termCount++;
      }
      await Term.insertMany(terms, { ordered: true });
    } catch (err) {
      next(err);
    }
  },
  createCardExtension: async (req, res, next) => {
    try {
      const { title, term } = req.body;
      const userId = req.user._id;
      const card = await Card.findOne({ title });
      if (!card) {
        CardController.handleCreate(title, "", true, "", term, userId, next);
      } else {
        let termCount = await Term.find({ cardId: card._id }).count();
        const newTerm = new Term({
          prompt: term[0].prompt,
          answer: term[0].answer,
          cardId: card._id,
          position: termCount > 0 ? termCount : 0,
        });
        await newTerm.save();
      }
      res.status(200).json({
        type: "success",
        des: "Success!!!!!",
      });
    } catch (err) {
      next(err);
    }
  },
  getAllCard: async (req, res, next) => {
    const query = req.query.q;
    let cards, count, title;
    const { limit } = Pagination(req);
    try {
      if (query) {
        if (query === "trend") {
          cards = await Card.find({ share: true })
            .populate("user", "username")
            .sort({ views: -1 })
            .limit(limit);
          const cnt = await Card.find({ share: true }).count();
          count = cnt > 10 ? 10 : cnt;
          title = "Phổ biến";
        } else if (query === "rate") {
          cards = await Card.find({ share: true })
            .populate("user", "username")
            .sort({ "rate.total": 1, "rate.quantity": 1 })
            .limit(limit);
          const cnt = await Card.find({ share: true }).count();
          count = cnt > 10 ? 10 : cnt;
          title = "Đánh giá cao";
        } else if (query === "saved") {
          const { userId } = req.query;
          const cardSaved = await CardSaved.find({ user: userId });
          if (cardSaved) {
            let cardsSaved2 = [];
            for (const item of cardSaved) {
              const cardSavedItem = await Card.findById(item.card);
              cardsSaved2.push(cardSavedItem);
            }
            cards = cardsSaved2;
            count = cardsSaved2.length;
            title = "Bạn đã lưu";
          }
        } else if (query === "suggest") {
          cards = await Card.aggregate([
            { $match: { views: { $gte: 10 } } },
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user",
              },
            },
            {
              $unwind: "$user",
            },
            {
              $project: {
                background: 1,
                description: 1,
                title: 1,
                views: 1,
                user: { username: 1 },
                _id: 1,
              },
            },
            { $sample: { size: limit } },
          ]);
          const cnt = await Card.find({ share: true }).count();
          count = cnt > 10 ? 10 : cnt;
          title = "Đề xuất";
        } else if (query === "library") {
          const { userId } = req.query;
          cards = await Card.find({ user: userId })
            .populate("user", "username -_id")
            .limit(limit);
          const cnt = await Card.find({ user: userId }).count();
          count = cnt > 10 ? 10 : cnt;
          title = "Thư viện";
        }
        let total = 0;
        if (count % limit === 0) {
          total = count / limit;
        } else {
          total = Math.floor(count / limit) + 1;
        }
        res.status(200).json({ cards, total, title });
      } else {
        CardController.getHome(req, res, next);
      }
    } catch (err) {
      next(err);
    }
  },
  getHome: async (req, res, next) => {
    const { limit } = Pagination(req);
    const { userId } = req.query;
    try {
      const populateCards = await Card.find({ share: true })
        .populate("user", "username")
        .sort({ views: -1 })
        .limit(limit);

      const rateCards = await Card.find({ share: true })
        .populate("user", "username")
        .sort({ "rate.total": -1, "rate.quantity": -1 })
        .limit(limit);

      const cardSavedArr = await CardSaved.find({ user: userId });
      let cardSaveds = [];
      if (cardSavedArr) {
        for (const item of cardSavedArr) {
          const cardSavedItem = await Card.findById(item.card);
          if (cardSavedItem) {
            cardSaveds.push(cardSavedItem);
          }
        }
      }
      const suggestCards = await Card.aggregate([
        { $match: { $and: [{ views: { $gte: 10 } }, { share: true }] } },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $project: {
            background: 1,
            description: 1,
            title: 1,
            views: 1,
            user: { username: 1 },
            _id: 1,
          },
        },
        { $sample: { size: limit } },
      ]);

      res.status(200).json({
        populateCards: {
          data: populateCards,
          title: "Phổ biến",
        },
        rateCards: {
          data: rateCards,
          title: "Đánh giá cao",
        },
        suggestCards: {
          data: suggestCards,
          title: "Đề xuất",
        },
        cardSaveds: {
          data: cardSaveds,
          title: "Bạn đã lưu",
        },
      });
    } catch (err) {
      next(err);
    }
  },
  getCardInUser: async (req, res, next) => {
    const userId = req.user._id;
    const { limit } = Pagination(req);
    try {
      const cardsOfUser = await Card.find({ user: userId })
        .populate("user", "username -_id")
        .limit(limit);
      const cardSaved = await CardSaved.find({ user: userId }).limit(limit);
      const count1 = cardsOfUser.length;
      let cardsSaved2 = [];
      if (cardSaved) {
        for (const item of cardSaved) {
          const cardSavedItem = await Card.findById(item.card);
          cardsSaved2.push(cardSavedItem);
        }
      }
      const count2 = cardSaved.length;
      let total1 = 0,
        total2 = 0;
      if (count1 % limit === 0) {
        total1 = count1 / limit;
      } else {
        total1 = Math.floor(count1 / limit) + 1;
      }
      if (count2 % limit === 0) {
        total2 = count2 / limit;
      } else {
        total2 = Math.floor(count2 / limit) + 1;
      }
      res.status(200).json({
        library: {
          cards: cardsOfUser,
          total: total1,
          title: "Học phần của bạn",
        },
        cardSaved: {
          cards: cardsSaved2,
          total: total2,
          title: "Học phần đã lưu",
        },
      });
    } catch (err) {
      next(err);
    }
  },
  getCardsOfUser: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const cards = await Card.find({ user: userId }, { title: 1, _id: 1 });
      res.status(200).json(cards);
    } catch (error) {
      next(error);
    }
  },
  AddCardExtension: async (req, res, next) => {
    try {
      const { card, prompt, answer } = req.body;
      let termCount = await Term.find({ cardId: card }).count();
      const newAnswer = await fetch(
        `https://api.mymemory.translated.net/get?q=${prompt}&langpair=en|vi`
      );
      const newAnswer2 = await newAnswer.json();
      const translate = newAnswer2.matches.sort(
        (a, b) => b["usage-count"] - a["usage-count"]
      );
      const newTerm = new Term({
        prompt: prompt,
        answer: translate[0].translation,
        cardId: card,
        position: termCount > 0 ? termCount : 0,
      });
      await newTerm.save();
      res.status(200).json({ msg: "success!!!!", type: "success" });
    } catch (error) {
      next(error);
    }
  },
  getCardById: async (req, res, next) => {
    const { cardId } = req.params;
    const { limit, skip } = Pagination(req);
    try {
      const cards = await Card.findOne({ _id: cardId }).populate(
        "user",
        "username"
      );
      const terms = await Term.find({ cardId })
        .sort({ position: 1 })
        .skip(skip)
        .limit(limit);
      const count = await Term.find({ cardId }).count();
      const rateCard = await Rate.find({ card: cardId });
      let sum = 0;
      for (const r of rateCard) {
        sum += r.rate;
      }
      let length = rateCard.length | 0;
      let avgRate = Math.round(sum / length);
      const rate = {
        total: avgRate,
        time: length,
      };
      let total = 0;
      if (count % limit === 0) {
        total = count / limit;
      } else {
        total = Math.floor(count / limit) + 1;
      }
      res.status(200).json({ cards, terms, rate, total });
    } catch (err) {
      next(err);
    }
  },
  updateCard: async (req, res, next) => {
    const { cardId } = req.params;
    const termArr = req.body.card.term;
    try {
      const card = await Card.findById(cardId);
      const terms = await Term.find({ cardId: cardId }).sort({ position: 1 });
      if (card.user.valueOf() === req.body.userId) {
        try {
          await card.update({ $set: req.body.card });

          let termCount = await Term.find({ cardId: cardId }).count();

          for (let i = 0; i < termArr.length; i++) {
            if (terms[i]) {
              if (
                terms[i].prompt !== termArr[i].prompt ||
                terms[i].answer !== termArr[i].answer
              ) {
                await terms[i].updateOne({
                  $set: {
                    position: i,
                    prompt: termArr[i].prompt,
                    answer: termArr[i].answer,
                  },
                });
              }
            } else {
              const newTerm = new Term({
                prompt: termArr[i].prompt,
                answer: termArr[i].answer,
                cardId: cardId,
                position: termCount > 0 ? termCount : 0,
              });
              await newTerm.save();
              termCount++;
            }
          }
          res.status(200).json({
            type: "success",
            msg: "the post has been updated",
          });
        } catch (error) {
          next(error);
        }
      } else {
        res.status(400).json({
          type: "error",
          msg: "you can update only your post",
        });
      }
    } catch (err) {
      next(err);
    }
  },
  savedCard: async (req, res, next) => {
    const { cardId } = req.params;
    const userId = req.user._id;
    try {
      const cardSaved = await CardSaved.findOne({ card: cardId, user: userId });
      if (cardSaved)
        return res.status(200).json({ code: 200, msg: "Đã được lưu trước đó" });
      const card = await Card.findById(cardId);
      if (card.user.valueOf() === userId)
        return res
          .status(400)
          .json({ code: 400, msg: "Bạn chỉ được lưu học phần người khác" });
      const newCardSaved = new CardSaved({ card: cardId, user: userId });
      await newCardSaved.save();
      res.status(200).json({ code: 200, msg: "Lưu thành công" });
    } catch (err) {
      next(err);
    }
  },
  addView: async (req, res, next) => {
    const { cardId } = req.params;
    try {
      await Card.findByIdAndUpdate(cardId, {
        $inc: { views: 1 },
      });
      res.status(200).json("The view has been increased.");
    } catch (err) {
      next(err);
    }
  },
  search: async (req, res, next) => {
    const query = req.params.q;
    try {
      const cards = await Card.find({ $text: { $search: query } }).limit(5);
      const users = await User.find({ $text: { $search: query } }).limit(5);
      const data = [
        cards && {
          title: "Khóa học",
          data: cards,
        },
        users && {
          title: "Người dùng",
          data: users,
        },
      ];
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
  rateCard: async (req, res, next) => {
    const { cardId } = req.params;
    const { rateNum } = req.body;
    const userId = req.user._id;
    try {
      const rate = await Rate.findOne({ card: cardId, user: userId });
      if (!rate) {
        const newRate = new Rate({ card: cardId, rate: rateNum, user: userId });
        await newRate.save();
        await Card.findByIdAndUpdate(cardId, {
          $inc: { "rate.total": 1, "rate.quantity": rateNum },
        });
      } else {
        let inc = rateNum - rate.rate;
        await rate.updateOne({ $set: { rate: rateNum } });
        await Card.findByIdAndUpdate(cardId, {
          $inc: { "rate.quantity": inc },
        });
      }
      res.status(200).json({ code: 200, msg: "updated rate" });
    } catch (err) {
      next(err);
    }
  },
  deleteCard: async (req, res, next) => {
    try {
      const { cardId } = req.params;
      const userId = req.user._id;
      const card = await Card.findById(cardId);
      const user = await User.findById(userId);
      if (card.user.valueOf() === userId || user.isAdmin) {
        await card.deleteOne();
        await Term.deleteMany({ cardId });
        res.status(200).json({
          type: "success",
          msg: "Xóa thành công",
        });
      } else {
        res.status(400).json({
          type: "error",
          msg: "Bạn không thể xóa học phần này",
        });
      }
    } catch (err) {
      next(err);
    }
  },
  getTedTranslation: async (req, res, next) => {
    const { videoId } = req.query;
    try {
      const endpoint = "https://www.ted.com/graphql";

      const graphQLClient = new GraphQLClient(endpoint, {
        credentials: "include",
        mode: "cors",
      });

      const query = gql`
            {
                translation(language: "en", videoId: "${videoId}"){
                    paragraphs{
                        cues{
                            text
                            time
                        }
                    }
                }
            }`;

      const data = await graphQLClient.request(query);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  getVideoTed: async (req, res, next) => {
    const { videoId } = req.query;
    try {
      const endpoint = "https://www.ted.com/graphql";

      const graphQLClient = new GraphQLClient(endpoint, {
        credentials: "include",
        mode: "cors",
      });

      const query = gql`{
            video(slug: "${videoId}"){
                playerData
            }
          }`;

      const data = await graphQLClient.request(query);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  getListTed: async (req, res, next) => {
    try {
      const endpoint = "https://www.ted.com/graphql";

      const graphQLClient = new GraphQLClient(endpoint, {
        credentials: "include",
        mode: "cors",
      });

      const query = gql`
        {
          topic(slug: "communication") {
            videos {
              nodes {
                slug
                title
                publishedAt
                duration
                id
                primaryImageSet {
                  height
                  width
                  url
                }
              }
            }
          }
        }
      `;

      const data = await graphQLClient.request(query);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  getAllCards: async (req, res, next) => {
    try {
      const allCards = await Card.find().populate("user", "username");
      res.status(200).json(allCards);
    } catch (err) {
      next(err);
    }
  },
  createCardAdmin: async (req, res, next) => {
    try {
      const { title, des, json, background } = req.body;
      const term = JSON.parse(json);
      const userId = req.user._id;
      const newCard = new Card({
        title,
        description: des,
        user: userId,
        background,
      });
      await newCard.save();
      let termCount = await Term.find({ cardId: newCard._id }).count();
      let terms = [];
      for (let i = 0; i < term.length; i++) {
        const termItem = {
          prompt: term[i].prompt,
          answer: term[i].answer,
          cardId: newCard._id,
          position: termCount > 0 ? termCount : 0,
        };
        terms.push(termItem);
        termCount++;
      }
      await Term.insertMany(terms, { ordered: true });
      res.status(200).json({ msg: "success" });
    } catch (err) {
      next(err);
    }
  },
  deleteTerm: async (req, res, next) => {
    try {
      const { cardId } = req.body;
      await Term.deleteMany({ cardId });
      return res.status(200).json({ msg: "delete success!!!!" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = CardController;
