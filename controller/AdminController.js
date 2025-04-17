const User = require("../model/User");
const Card = require("../model/Card");
const Invoice = require("../model/Invoice");

const AdminController = {
  statistical: async (req, res, next) => {
    try {
      const { period } = req.query;

     
      if (!["day", "week", "month", "year", "all"].includes(period)) {
        return res.status(400).json({
          success: false,
          message: "Invalid period. Use 'day', 'week', 'month', or 'year'.",
        });
      }

     
      const now = new Date();
      let currentStartDate, currentEndDate, previousStartDate, previousEndDate;

      if (period === "day") {
        currentEndDate = new Date(now);
        currentStartDate = new Date(now.setDate(now.getDate() - 1));
        previousEndDate = new Date(currentStartDate);
        previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 1));
      } else if (period === "week") {
        currentEndDate = new Date(now);
        currentStartDate = new Date(now.setDate(now.getDate() - 7));
        previousEndDate = new Date(currentStartDate);
        previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 7));
      } else if (period === "month") {
        currentEndDate = new Date(now);
        currentStartDate = new Date(now.setMonth(now.getMonth() - 1));
        previousEndDate = new Date(currentStartDate);
        previousStartDate = new Date(previousEndDate.setMonth(previousEndDate.getMonth() - 1));
      } else if (period === "year") {
        currentEndDate = new Date(now);
        currentStartDate = new Date(now.setFullYear(now.getFullYear() - 1));
        previousEndDate = new Date(currentStartDate);
        previousStartDate = new Date(previousEndDate.setFullYear(previousEndDate.getFullYear() - 1));
      } else if (period === "all") {
        currentEndDate = new Date(now);
        currentStartDate = new Date("1970-01-01");
        previousEndDate = currentEndDate;
        previousStartDate = currentStartDate; // Set to same range
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
                { createdAt: { $exists: false } }, // Include cards without createdAt
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
                { createdAt: { $exists: false } }, // Include cards without createdAt
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

      // Tạo mảng data theo định dạng yêu cầu
      const data = [
        {
          title: "Người dùng",
          value: current.totalUsers,
          percentageValue: calculatePercentage(current.totalUsers, previous.totalUsers),
          percentageType: current.totalUsers >= previous.totalUsers ? "increase" : "decrease",
          icon: "fas fa-users yellow",
        },
        {
          title: "Thẻ Flashcard",
          value: current.totalCards,
          percentageValue: calculatePercentage(current.totalCards, previous.totalCards),
          percentageType: current.totalCards >= previous.totalCards ? "increase" : "decrease",
          icon: "fas fa-book red",
        },
        {
          title: "Hóa đơn",
          value: current.totalInvoices,
          percentageValue: calculatePercentage(current.totalInvoices, previous.totalInvoices),
          percentageType: current.totalInvoices >= previous.totalInvoices ? "increase" : "decrease",
          icon: "fas fa-file-invoice-dollar blue",
        },
        {
          title: "Doanh thu",
          value: current.totalRevenue.toLocaleString("vi-VN"),
          percentageValue: calculatePercentage(current.totalRevenue, previous.totalRevenue),
          percentageType: current.totalRevenue >= previous.totalRevenue ? "increase" : "decrease",
          icon: "fas fa-money-bill-wave green",
        },
      ];

      return res.status(200).json({
        success: true,
        data,
        time: {
          startDate: currentStartDate.toISOString(),
          endDate: currentEndDate.toISOString(),
        },
      });
    } catch (error) {
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

      const revenueByDay= await Invoice.aggregate([
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
      ])
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
      const { page = 1, limit = 10, sort = 'views:desc' } = req.query;

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
      let sortField = 'createdAt';
      let sortOrder = -1; // Default: descending
      if (sort) {
        const [field, order] = sort.split(':');
        if (!field || !['title', 'createdAt', "views"].includes(field)) {
          return res.status(400).json({
            success: false,
            message: "Invalid sort field. Use 'name' or 'createdAt'.",
          });
        }
        sortField = field;
        sortOrder = order === 'asc' ? 1 : -1;
      }

      // Query cards with pagination and sorting
      const skip = (pageNum - 1) * limitNum;
      const [cards, totalItems] = await Promise.all([
        Card.find()
          .sort({ [sortField]: sortOrder })
          .skip(skip)
          .limit(limitNum).select("-password")
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
  }
};

module.exports = AdminController;