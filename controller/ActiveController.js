const Rep = require("../model/Rep");
const User = require("../model/User");
const mongoose = require("mongoose");
const ActiveController = {
  getActive: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const currentDate = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const result = await Rep.aggregate([
        {
          $match: { user: mongoose.Types.ObjectId(userId) },
        },
        {
          $facet: {
            prepareCount: [
              { $match: { dateRep: { $gt: currentDate } } },
              { $group: { _id: "$term" } },
              { $count: "count" },
            ],
            outDateCount: [
              { $match: { dateRep: { $lt: currentDate } } },
              { $group: { _id: "$term" } },
              { $count: "count" },
            ],
            todayCount: [
              {
                $match: { updatedAt: { $gte: startOfToday, $lt: endOfToday } },
              },
              { $group: { _id: "$term" } },
              { $count: "count" },
            ],
            allCount: [{ $group: { _id: "$term" } }, { $count: "count" }],
          },
        },
      ]);
      const [{ prepareCount, outDateCount, todayCount, allCount }] = result;
      const [a, b, c, d] = [
        prepareCount[0]?.count || 0,
        outDateCount[0]?.count || 0,
        todayCount[0]?.count || 0,
        allCount[0]?.count || 0,
      ];
      const response = [
        {
          text: "Ôn tập",
          data: b,
        },
        {
          text: "Chuẩn bị",
          data: a,
        },
        {
          text: "Đã học hôm nay",
          data: c,
        },
        {
          text: "Đã học",
          data: d,
        },
      ];
      return res.status(200).json({ data: response, max: d });
    } catch (error) {
      next(error);
    }
  },
  getAchieve: async (req, res, next) => {
    try {
      const { limit } = req.query;
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
          $limit: limit * 1,
        },
      ]);
      res.status(200).json(count);
    } catch (error) {
      next(error);
    }
  },
  getRankLearn: async (req, res, next) => {
    try {
      const { limit } = req.query;
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
          $limit: limit * 1,
        },
      ]);
      res.status(200).json(count);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ActiveController;
