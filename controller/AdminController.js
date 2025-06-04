const User = require("../model/User");
const Card = require("../model/Card");
const Invoice = require("../model/Invoice");
const dayjs = require("dayjs");

const AdminController = {
  statistical: async (req, res, next) => {
    try {
      const { period } = req.query;

      // Kiểm tra period
      if (
        !period ||
        !["day", "week", "month", "year", "all"].includes(period)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid period. Use 'day', 'week', 'month', 'year', or 'all'.",
        });
      }

      // Tính toán khoảng thời gian
      const now = dayjs();
      let currentStartDate,
        currentEndDate,
        previousStartDate,
        previousEndDate,
        samePeriodStartDate,
        samePeriodEndDate;

      if (period === "day") {
        // Ngày hôm nay
        currentStartDate = now.startOf("day").toDate(); // 2025-06-04 00:00:00
        currentEndDate = now.endOf("day").toDate(); // 2025-06-04 23:59:59
        // Ngày hôm qua
        previousStartDate = now.startOf("day").subtract(1, "day").toDate(); // 2025-06-03 00:00:00
        previousEndDate = now.endOf("day").subtract(1, "day").toDate(); // 2025-06-03 23:59:59
        // Cùng kỳ: Ngày này năm trước
        samePeriodStartDate = now.startOf("day").subtract(1, "year").toDate(); // 2024-06-04 00:00:00
        samePeriodEndDate = now.endOf("day").subtract(1, "year").toDate(); // 2024-06-04 23:59:59
      } else if (period === "week") {
        // Từ hôm nay đến 6 ngày trước
        currentStartDate = now.startOf("day").subtract(6, "day").toDate(); // 2025-05-29 00:00:00
        currentEndDate = now.endOf("day").toDate(); // 2025-06-04 23:59:59
        // Tuần trước
        previousStartDate = now.startOf("day").subtract(13, "day").toDate(); // 2025-05-22 00:00:00
        previousEndDate = now.endOf("day").subtract(7, "day").toDate(); // 2025-05-28 23:59:59
        // Cùng kỳ: Tuần tương ứng năm trước
        samePeriodStartDate = now
          .startOf("day")
          .subtract(1, "year")
          .subtract(6, "day")
          .toDate(); // 2024-05-29
        samePeriodEndDate = now.endOf("day").subtract(1, "year").toDate(); // 2024-06-04
      } else if (period === "month") {
        // Từ hôm nay đến 30 ngày trước
        currentStartDate = now.startOf("day").subtract(30, "day").toDate(); // 2025-05-05 00:00:00
        currentEndDate = now.endOf("day").toDate(); // 2025-06-04 23:59:59
        // 30 ngày trước nữa
        previousStartDate = now.startOf("day").subtract(60, "day").toDate(); // 2025-04-05
        previousEndDate = now.endOf("day").subtract(31, "day").toDate(); // 2025-05-04
        // Cùng kỳ: 30 ngày tương ứng năm trước
        samePeriodStartDate = now
          .startOf("day")
          .subtract(1, "year")
          .subtract(30, "day")
          .toDate(); // 2024-05-05
        samePeriodEndDate = now.endOf("day").subtract(1, "year").toDate(); // 2024-06-04
      } else if (period === "year") {
        // Từ hôm nay đến 365 ngày trước
        currentStartDate = now.startOf("day").subtract(365, "day").toDate(); // 2024-06-05 00:00:00
        currentEndDate = now.endOf("day").toDate(); // 2025-06-04 23:59:59
        // 365 ngày trước nữa
        previousStartDate = now.startOf("day").subtract(730, "day").toDate(); // 2023-06-05
        previousEndDate = now.endOf("day").subtract(366, "day").toDate(); // 2024-06-04
        // Cùng kỳ: 365 ngày trước đó
        samePeriodStartDate = now
          .startOf("day")
          .subtract(2, "year")
          .subtract(365, "day")
          .toDate(); // 2023-06-05
        samePeriodEndDate = now.endOf("day").subtract(2, "year").toDate(); // 2024-06-04
      } else if (period === "all") {
        // Tất cả thời gian
        currentStartDate = new Date("1970-01-01");
        currentEndDate = now.toDate();
        previousStartDate = null;
        previousEndDate = null;
        samePeriodStartDate = null;
        samePeriodEndDate = null;
      }

      // Truy vấn song song
      const [
        currentUsersAgg,
        currentCardsAgg,
        currentInvoicesAgg,
        currentRevenueAgg,
        previousUsersAgg,
        previousCardsAgg,
        previousInvoicesAgg,
        previousRevenueAgg,
        samePeriodUsersAgg,
        samePeriodCardsAgg,
        samePeriodInvoicesAgg,
        samePeriodRevenueAgg,
      ] = await Promise.all([
        // Current period: Users
        User.aggregate([
          {
            $match: {
              createdAt: { $gte: currentStartDate, $lte: currentEndDate },
            },
          },
          { $group: { _id: null, totalUsers: { $sum: 1 } } },
        ]),
        // Current period: Cards
        Card.aggregate([
          {
            $match: {
              createdAt: { $gte: currentStartDate, $lte: currentEndDate },
            },
          },
          { $group: { _id: null, totalCards: { $sum: 1 } } },
        ]),
        // Current period: Invoices
        Invoice.aggregate([
          {
            $match: {
              createdAt: { $gte: currentStartDate, $lte: currentEndDate },
            },
          },
          { $group: { _id: null, totalInvoices: { $sum: 1 } } },
        ]),
        // Current period: Revenue
        Invoice.aggregate([
          {
            $match: {
              status: "SUCCESS",
              createdAt: { $gte: currentStartDate, $lte: currentEndDate },
            },
          },
          { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
        ]),
        // Previous period: Users
        period === "all"
          ? [{ totalUsers: 0 }]
          : User.aggregate([
              {
                $match: {
                  createdAt: { $gte: previousStartDate, $lte: previousEndDate },
                },
              },
              { $group: { _id: null, totalUsers: { $sum: 1 } } },
            ]),
        // Previous period: Cards
        period === "all"
          ? [{ totalCards: 0 }]
          : Card.aggregate([
              {
                $match: {
                  createdAt: { $gte: previousStartDate, $lte: previousEndDate },
                },
              },
              { $group: { _id: null, totalCards: { $sum: 1 } } },
            ]),
        // Previous period: Invoices
        period === "all"
          ? [{ totalInvoices: 0 }]
          : Invoice.aggregate([
              {
                $match: {
                  createdAt: { $gte: previousStartDate, $lte: previousEndDate },
                },
              },
              { $group: { _id: null, totalInvoices: { $sum: 1 } } },
            ]),
        // Previous period: Revenue
        period === "all"
          ? [{ totalRevenue: 0 }]
          : Invoice.aggregate([
              {
                $match: {
                  status: "SUCCESS",
                  createdAt: { $gte: previousStartDate, $lte: previousEndDate },
                },
              },
              { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
            ]),
        // Same period last year: Users
        period === "all"
          ? [{ totalUsers: 0 }]
          : User.aggregate([
              {
                $match: {
                  createdAt: {
                    $gte: samePeriodStartDate,
                    $lte: samePeriodEndDate,
                  },
                },
              },
              { $group: { _id: null, totalUsers: { $sum: 1 } } },
            ]),
        // Same period last year: Cards
        period === "all"
          ? [{ totalCards: 0 }]
          : Card.aggregate([
              {
                $match: {
                  createdAt: {
                    $gte: samePeriodStartDate,
                    $lte: samePeriodEndDate,
                  },
                },
              },
              { $group: { _id: null, totalCards: { $sum: 1 } } },
            ]),
        // Same period last year: Invoices
        period === "all"
          ? [{ totalInvoices: 0 }]
          : Invoice.aggregate([
              {
                $match: {
                  createdAt: {
                    $gte: samePeriodStartDate,
                    $lte: samePeriodEndDate,
                  },
                },
              },
              { $group: { _id: null, totalInvoices: { $sum: 1 } } },
            ]),
        // Same period last year: Revenue
        period === "all"
          ? [{ totalRevenue: 0 }]
          : Invoice.aggregate([
              {
                $match: {
                  status: "SUCCESS",
                  createdAt: {
                    $gte: samePeriodStartDate,
                    $lte: samePeriodEndDate,
                  },
                },
              },
              { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
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

      // Lấy giá trị cùng kỳ
      const samePeriod = {
        totalUsers: samePeriodUsersAgg[0]?.totalUsers || 0,
        totalCards: samePeriodCardsAgg[0]?.totalCards || 0,
        totalInvoices: samePeriodInvoicesAgg[0]?.totalInvoices || 0,
        totalRevenue: samePeriodRevenueAgg[0]?.totalRevenue || 0,
      };

      // Tính phần trăm thay đổi
      const calculatePercentage = (current, compare) => {
        if (period === "all") return 0;
        if (compare === 0) return current === 0 ? 0 : 100;
        const change = ((current - compare) / compare) * 100;
        return Number(Math.abs(change).toFixed(2));
      };

      // Tạo response
      const data = [
        {
          title: "Người dùng",
          value: current.totalUsers,
          percentageValue: calculatePercentage(
            current.totalUsers,
            previous.totalUsers
          ),
          percentageType:
            current.totalUsers >= previous.totalUsers ? "increase" : "decrease",
          samePeriodPercentage: calculatePercentage(
            current.totalUsers,
            samePeriod.totalUsers
          ),
          samePeriodType:
            current.totalUsers >= samePeriod.totalUsers
              ? "increase"
              : "decrease",
          icon: "fas fa-users yellow",
        },
        {
          title: "Thẻ Flashcard",
          value: current.totalCards,
          percentageValue: calculatePercentage(
            current.totalCards,
            previous.totalCards
          ),
          percentageType:
            current.totalCards >= previous.totalCards ? "increase" : "decrease",
          samePeriodPercentage: calculatePercentage(
            current.totalCards,
            samePeriod.totalCards
          ),
          samePeriodType:
            current.totalCards >= samePeriod.totalCards
              ? "increase"
              : "decrease",
          icon: "fas fa-book red",
        },
        {
          title: "Hóa đơn",
          value: current.totalInvoices,
          percentageValue: calculatePercentage(
            current.totalInvoices,
            previous.totalInvoices
          ),
          percentageType:
            current.totalInvoices >= previous.totalInvoices
              ? "increase"
              : "decrease",
          samePeriodPercentage: calculatePercentage(
            current.totalInvoices,
            samePeriod.totalInvoices
          ),
          samePeriodType:
            current.totalInvoices >= samePeriod.totalInvoices
              ? "increase"
              : "decrease",
          icon: "fas fa-file-invoice-dollar blue",
        },
        {
          title: "Doanh thu",
          value: current.totalRevenue,
          percentageValue: calculatePercentage(
            current.totalRevenue,
            previous.totalRevenue
          ),
          percentageType:
            current.totalRevenue >= previous.totalRevenue
              ? "increase"
              : "decrease",
          samePeriodPercentage: calculatePercentage(
            current.totalRevenue,
            samePeriod.totalRevenue
          ),
          samePeriodType:
            current.totalRevenue >= samePeriod.totalRevenue
              ? "increase"
              : "decrease",
          icon: "fas fa-money-bill-wave green",
        },
      ];

      return res.status(200).json({
        success: true,
        data,
        time: {
          startDate: currentStartDate.toISOString(),
          endDate: currentEndDate.toISOString(),
          previousStartDate: previousStartDate?.toISOString(),
          previousEndDate: previousEndDate?.toISOString(),
          samePeriodStartDate: samePeriodStartDate?.toISOString(),
          samePeriodEndDate: samePeriodEndDate?.toISOString(),
        },
      });
    } catch (error) {
      console.error("Statistical error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Thống kê thất bại",
        error: error.message,
      });
    }
  },
  recentIncome: async (req, res, next) => {
    try {
      const now = new Date();
      const endDate = new Date(now);
      const startDate = new Date(now.setDate(now.getDate() - 7));

      const revenueByDay = await Invoice.aggregate([
        {
          $match: {
            status: "SUCCESS",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            income: { $sum: { $toDouble: "$amount" } },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);
      const dayMap = [
        { day: "Sun", dow: 1, income: 0 },
        { day: "Mon", dow: 2, income: 0 },
        { day: "Tue", dow: 3, income: 0 },
        { day: "Wed", dow: 4, income: 0 },
        { day: "Thu", dow: 5, income: 0 },
        { day: "Fri", dow: 6, income: 0 },
        { day: "Sat", dow: 7, income: 0 },
      ];

      revenueByDay.forEach((item) => {
        const index = dayMap.findIndex((d) => d.dow === item._id);
        if (index !== -1) {
          dayMap[index].income = item.income;
        }
      });

      const orderedData = [
        dayMap[1],
        dayMap[2],
        dayMap[3],
        dayMap[4],
        dayMap[5],
        dayMap[6],
        dayMap[0],
      ].map(({ day, income }) => ({ day, income }));

      return res.status(200).json({
        success: true,
        data: orderedData,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lấy dữ liệu doanh thu thất bại",
        error: error.message,
      });
    }
  },
  getCards: async (req, res, next) => {
    try {
      const { page = 1, limit = 10, sort = "views:desc" } = req.query;

      // Parse pagination parameters
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid page number",
        });
      }
      if (isNaN(limitNum) || limitNum < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid limit",
        });
      }

      // Parse sort parameter (e.g., "name:asc" or "createdAt:desc")
      let sortField = "createdAt";
      let sortOrder = -1; // Default: descending
      if (sort) {
        const [field, order] = sort.split(":");
        if (!field || !["title", "createdAt", "views"].includes(field)) {
          return res.status(400).json({
            success: false,
            message: "Invalid sort field. Use 'name' or 'createdAt'.",
          });
        }
        sortField = field;
        sortOrder = order === "asc" ? 1 : -1;
      }

      // Query cards with pagination and sorting
      const skip = (pageNum - 1) * limitNum;
      const [cards, totalItems] = await Promise.all([
        Card.find()
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum)
          .select("-password")
          .lean(),
        Card.countDocuments(),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalItems / limitNum);

      return res.status(200).json({
        success: true,
        data: {
          cards,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalItems,
            limit: limitNum,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = AdminController;
