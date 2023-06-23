const Notification = require("../model/Notification");
const User = require("../model/User");

const NotificationController = {
  GetNotifi: async (req, res, next) => {
    const userId = req.user._id;
    try {
      const notifis = await Notification.find({ user: userId }).sort({
        updatedAt: -1,
      });
      res.status(200).json(notifis);
    } catch (error) {
      next(error);
    }
  },
  CreateNotifi: async (req, res, next) => {
    try {
      const { content, userId } = req.body;
      const notifi = new Notification({ content, user: userId });
      await notifi.save();

      res.status(201).json({ msg: "Created Notification!!!" });
    } catch (error) {
      next(error);
    }
  },
  ReadNotifi: async (req, res, next) => {
    try {
      const { notifiId } = req.body;
      const notifi = await Notification.findByIdAndUpdate(
        notifiId,
        {
          $set: {
            isRead: true,
          },
        },
        { new: true }
      );
      res.status(200).json(notifi);
    } catch (error) {
      next(error);
    }
  },
  CreateMultiple: async (req, res, next) => {
    try {
      const { content } = req.body;
      const user = await User.find();
      const userCount = user.length;
      const notifis = [];
      for (let i = 0; i < userCount; i++) {
        const notifi = {
          user: user[i]._id,
          content,
        };
        notifis.push(notifi);
      }
      await Notification.insertMany(notifis, { ordered: true });
      return res
        .status(201)
        .json({ status: "success", msg: "tạo thành công!" });
    } catch (error) {
      next(error);
    }
  },
  DeleteNotifi: async (req, res, next) => {
    try {
      const { content } = req.body;
      await Notification.deleteMany({ content });
      res.status(200).json({ msg: "delete success" });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = NotificationController;
