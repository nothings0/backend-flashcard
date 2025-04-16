const User = require("../model/User");
const Card = require("../model/Card");
const Invoice = require("../model/Invoice");

const AdminController = {
  async statistical(req, res, next) {
    try {
      const { period } = req.query; // Lấy tham số period từ query (e.g., "day", "week", "month", hoặc "year")

      // Validate period
      if (!["day", "week", "month", "year"].includes(period)) {
        return res.status(400).json({
          success: false,
          message: "Invalid period. Use 'day', 'week', 'month', or 'year'.",
        });
      }

      // Tính toán khoảng thời gian hiện tại và trước đó
      const now = new Date(); // Current date: 2025-04-15
      let currentStartDate, currentEndDate, previousStartDate, previousEndDate;

      if (period === "day") {
        currentEndDate = new Date(now); // 2025-04-15
        currentStartDate = new Date(now.setDate(now.getDate() - 1)); // 2025-04-14
        previousEndDate = new Date(currentStartDate); // 2025-04-14
        previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 1)); // 2025-04-13
      } else if (period === "week") {
        currentEndDate = new Date(now); // 2025-04-15
        currentStartDate = new Date(now.setDate(now.getDate() - 7)); // 2025-04-08
        previousEndDate = new Date(currentStartDate); // 2025-04-08
        previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 7)); // 2025-04-01
      } else if (period === "month") {
        currentEndDate = new Date(now); // 2025-04-15
        currentStartDate = new Date(now.setMonth(now.getMonth() - 1)); // 2025-03-15
        previousEndDate = new Date(currentStartDate); // 2025-03-15
        previousStartDate = new Date(previousEndDate.setMonth(previousEndDate.getMonth() - 1)); // 2025-02-15
      } else if (period === "year") {
        currentEndDate = new Date(now); // 2025-04-15
        currentStartDate = new Date(now.setFullYear(now.getFullYear() - 1)); // 2024-04-15
        previousEndDate = new Date(currentStartDate); // 2024-04-15
        previousStartDate = new Date(previousEndDate.setFullYear(previousEndDate.getFullYear() - 1)); // 2023-04-15
      }

      // Promise.all để thực hiện song song
      const [
        currentUsersAgg,
        currentCardsAgg,
        currentInvoicesAgg,
        currentRevenueAgg,
        previousUsersAgg,
        previousCardsAgg,
        previousInvoicesAgg,
        previousRevenueAgg,
      ] = await Promise.all([
        // Current period: Users
        User.aggregate([
          { $match: { createdAt: { $gte: currentStartDate, $lte: currentEndDate } } },
          { $group: { _id: null, totalUsers: { $sum: 1 } } },
        ]),
        // Current period: Cards
        Card.aggregate([
          {
            $match: {
              $or: [
                { createdAt: { $gte: currentStartDate, $lte: currentEndDate } },
                { createdAt: { $exists: false } }, // Include terms without createdAt
              ],
            },
          },
          { $group: { _id: null, totalCards: { $sum: 1 } } },
        ]).then((result) => {
          console.log(`Card aggregation for ${period} (start: ${currentStartDate}, end: ${currentEndDate}):`, result);
          return result;
        }),
        // Current period: Invoices
        Invoice.aggregate([
          { $match: { createdAt: { $gte: currentStartDate, $lte: currentEndDate } } },
          { $group: { _id: null, totalInvoices: { $sum: 1 } } },
        ]),
        // Current period: Revenue
        Invoice.aggregate([
          { $match: { status: "SUCCESS", createdAt: { $gte: currentStartDate, $lte: currentEndDate } } },
          { $group: { _id: null, totalRevenue: { $sum: { $toDouble: "$amount" } } } },
        ]),
        // Previous period: Users
        User.aggregate([
          { $match: { createdAt: { $gte: previousStartDate, $lt: previousEndDate } } },
          { $group: { _id: null, totalUsers: { $sum: 1 } } },
        ]),
        // Previous period: Cards
        Card.aggregate([
          {
            $match: {
              $or: [
                { createdAt: { $gte: previousStartDate, $lt: previousEndDate } },
                { createdAt: { $exists: false } }, // Include terms without createdAt
              ],
            },
          },
          { $group: { _id: null, totalCards: { $sum: 1 } } },
        ]),
        // Previous period: Invoices
        Invoice.aggregate([
          { $match: { createdAt: { $gte: previousStartDate, $lt: previousEndDate } } },
          { $group: { _id: null, totalInvoices: { $sum: 1 } } },
        ]),
        // Previous period: Revenue
        Invoice.aggregate([
          { $match: { status: "SUCCESS", createdAt: { $gte: previousStartDate, $lt: previousEndDate } } },
          { $group: { _id: null, totalRevenue: { $sum: { $toDouble: "$amount" } } } },
        ]),
      ]);

      // Lấy giá trị hiện tại
      const current = {
        totalUsers: currentUsersAgg[0]?.totalUsers || 0,
        totalCards: currentCardsAgg[0]?.totalCards || 0,
        totalInvoices: currentInvoicesAgg[0]?.totalInvoices || 0,
        totalRevenue: currentRevenueAgg[0]?.totalRevenue || 0,
      };

      // Lấy giá trị trước đó
      const previous = {
        totalUsers: previousUsersAgg[0]?.totalUsers || 0,
        totalCards: previousCardsAgg[0]?.totalCards || 0,
        totalInvoices: previousInvoicesAgg[0]?.totalInvoices || 0,
        totalRevenue: previousRevenueAgg[0]?.totalRevenue || 0,
      };

      // Tính phần trăm tăng trưởng hoặc giảm
      const calculatePercentage = (current, previous) => {
        if (previous === 0) {
          return current === 0 ? 0 : 100; // Nếu previous là 0, trả về 100% nếu current > 0, ngược lại 0%
        }
        const change = ((current - previous) / previous) * 100;
        return Number(Math.abs(change).toFixed(2)); // Trả về giá trị tuyệt đối, làm tròn 2 chữ số
      };

      const total = {
        startDate: currentStartDate.toISOString(),
        endDate: currentEndDate.toISOString(),
        totalUsers: current.totalUsers,
        totalCards: current.totalCards,
        totalInvoices: current.totalInvoices,
        totalRevenue: current.totalRevenue,
        growth: {
          totalUsers: current.totalUsers >= previous.totalUsers ? calculatePercentage(current.totalUsers, previous.totalUsers) : 0,
          totalCards: current.totalCards >= previous.totalCards ? calculatePercentage(current.totalCards, previous.totalCards) : 0,
          totalInvoices: current.totalInvoices >= previous.totalInvoices ? calculatePercentage(current.totalInvoices, previous.totalInvoices) : 0,
          totalRevenue: current.totalRevenue >= previous.totalRevenue ? calculatePercentage(current.totalRevenue, previous.totalRevenue) : 0,
        },
        decline: {
          totalUsers: current.totalUsers < previous.totalUsers ? calculatePercentage(current.totalUsers, previous.totalUsers) : 0,
          totalCards: current.totalCards < previous.totalCards ? calculatePercentage(current.totalCards, previous.totalCards) : 0,
          totalInvoices: current.totalInvoices < previous.totalInvoices ? calculatePercentage(current.totalInvoices, previous.totalInvoices) : 0,
          totalRevenue: current.totalRevenue < previous.totalRevenue ? calculatePercentage(current.totalRevenue, previous.totalRevenue) : 0,
        },
      };

      return res.status(200).json({
        success: true,
        total,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Thống kê thất bại",
        error: error.message,
      });
    }
  },
};

module.exports = AdminController;