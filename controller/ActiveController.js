const Rep = require("../model/Rep");
// const Term = require("../model/Term");
// const Card = require("../model/Card");
const User = require("../model/User");

const ActiveController = {
  getActive: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const currentDate = new Date();
      const currentDate2 = new Date();
      const start = currentDate2.setHours(0, 0, 0, 0);
      const end = currentDate2.setHours(23, 59, 59, 999);
      const countPromise = Promise.all([
        Rep.find({
          $and: [{ dateRep: { $gt: currentDate } }, { user: userId }],
        }).count(),
        Rep.find({
          $and: [{ dateRep: { $lt: currentDate } }, { user: userId }],
        }).count(),
        Rep.find({
          $and: [{ updatedAt: { $gte: start, $lt: end } }, { user: userId }],
        }).count(),
      ]);
      const [prepareCount, outDateCount, todayCount] = await countPromise;
      const maxCount = Math.max(prepareCount, outDateCount, todayCount);
      const response = [
        {
          text: "Ôn tập",
          data: outDateCount,
        },
        {
          text: "Chuẩn bị",
          data: prepareCount,
        },
        {
          text: "Đã học hôm nay",
          data: todayCount,
        },
      ];
      return res.status(200).json({ data: response, max: maxCount });
    } catch (error) {
      next(error);
    }
  },
  getAchieve: async (req, res, next) => {
    try {
      const count = await User.aggregate([
        {
          $lookup: {
            from: "cards",
            localField: "_id",
            foreignField: "user",
            as: "cards",
          },
        },
        {
          $lookup: {
            from: "terms",
            localField: "cards._id",
            foreignField: "cardId",
            as: "terms",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "users",
          },
        },
        {
          $project: {
            _id: 1,
            username: 1,
            termCount: { $size: "$terms" },
          },
        },
        {
          $sort: {
            termCount: -1,
          },
        },
        {
          $limit: 5,
        },
      ]);
      res.status(200).json(count);
    } catch (error) {
      next(error);
    }
  },
  getRankLearn: async (req, res, next) => {
    try {
      const count = await User.aggregate([
        {
          $lookup: {
            from: "reps",
            localField: "_id",
            foreignField: "user",
            as: "reps",
          },
        },
        {
          $project: {
            _id: 1,
            username: 1,
            termCount: { $size: "$reps" },
          },
        },
        {
          $sort: {
            termCount: -1,
          },
        },
        {
          $limit: 5,
        },
      ]);
      res.status(200).json(count);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ActiveController;
