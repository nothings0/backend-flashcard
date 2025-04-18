const Notification = require("../model/Notification");
const User = require("../model/User");

const NotificationController = {
  // Lấy tối đa 8 thông báo mới nhất của người dùng
  GetNotifi: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const notifis = await Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(8);
      res.status(200).json(notifis);
    } catch (error) {
      next(error);
    }
  },
  GetNotifis: async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1; // mặc định trang 1
      const limit = parseInt(req.query.limit) || 8; // mặc định 8 thông báo
      const skip = (page - 1) * limit;

      const [notifis, total] = await Promise.all([
        Notification.find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments({}) // để biết tổng số thông báo
      ]);

      res.status(200).json({
        data: notifis,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      next(error);
    }
  },


  // Tạo thông báo cho một người dùng
  CreateNotifi: async (req, res, next) => {
    try {
      const { title, content, userId, url } = req.body;

      if (!title || !content || !userId) {
        return res.status(400).json({ msg: "Thiếu dữ liệu bắt buộc." });
      }

      const notifi = new Notification({
        title,
        content,
        user: userId,
        url: url || "",
      });

      await notifi.save();
      res.status(201).json({ msg: "Tạo thông báo thành công!" });
    } catch (error) {
      next(error);
    }
  },

  // Đánh dấu đã đọc thông báo
  ReadNotifi: async (req, res, next) => {
    try {
      const { notifiId } = req.body;

      if (!notifiId) {
        return res.status(400).json({ msg: "Thiếu ID thông báo." });
      }

      const notifi = await Notification.findByIdAndUpdate(
        notifiId,
        { isRead: true },
        { new: true }
      );

      if (!notifi) {
        return res.status(404).json({ msg: "Không tìm thấy thông báo." });
      }

      res.status(200).json(notifi);
    } catch (error) {
      next(error);
    }
  },

  // Gửi thông báo đến tất cả người dùng
  CreateMultiple: async (req, res, next) => {
    try {
      const { title, content, url } = req.body;

      if (!title || !content) {
        return res.status(400).json({ msg: "Thiếu tiêu đề hoặc nội dung." });
      }

      const users = await User.find({}, "_id");
      const notifis = users.map((user) => ({
        user: user._id,
        title,
        content,
        url: url || "",
      }));

      await Notification.insertMany(notifis, { ordered: true });

      res.status(201).json({ status: "success", msg: "Tạo thông báo hàng loạt thành công!" });
    } catch (error) {
      next(error);
    }
  },

  DeleteNotifi: async (req, res, next) => {
    try {
      const { id: _id } = req.params;

      if (!_id) {
        return res.status(400).json({ msg: "Thiếu nội dung để xóa." });
      }

      const result = await Notification.deleteOne({ _id });

      res.status(200).json({ msg: "Đã xóa thông báo", deletedCount: result.deletedCount });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = NotificationController;
