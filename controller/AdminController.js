const User = require("../model/User");
const Term = require("../model/Term");
const Invoice = require("../model/Invoice");

const AdminController = {
  statistical: async (req, res, next) => {
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
      const now = new Date(); // Current date: 2025-04-16
      let currentStartDate, currentEndDate, previousStartDate, previousEndDate;

      if (period === "day") {
        currentEndDate = new Date(now); // 2025-04-16
        currentStartDate = new Date(now.setDate(now.getDate() - 1)); // 2025-04-15
        previousEndDate = new Date(currentStartDate); // 2025-04-15
        previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 1)); // 2025-04-14
      } else if (period === "week") {
        currentEndDate = new Date(now); // 2025-04-16
        currentStartDate = new Date(now.setDate(now.getDate() - 7)); // 2025-04-09
        previousEndDate = new Date(currentStartDate); // 2025-04-09
        previousStartDate = new Date(previousEndDate.setDate(previousEndDate.getDate() - 7)); // 2025-04-02
      } else if (period === "month") {
        currentEndDate = new Date(now); // 2025-04-16
        currentStartDate = new Date(now.setMonth(now.getMonth() - 1)); // 2025-03-16
        previousEndDate = new Date(currentStartDate); // 2025-03-16
        previousStartDate = new Date(previousEndDate.setMonth(previousEndDate.getMonth() - 1)); // 2025-02-16
      } else if (period === "year") {
        currentEndDate = new Date(now); // 2025-04-16
        currentStartDate = new Date(now.setFullYear(now.getFullYear() - 1)); // 2024-04-16
        previousEndDate = new Date(currentStartDate); // 2024-04-16
        previousStartDate = new Date(previousEndDate.setFullYear(previousEndDate.getFullYear() - 1)); // 2023-04-16
      }

      // Promise.all để thực hiện song song
      const [
        currentUsersAgg,
        currentTermsAgg,
        currentInvoicesAgg,
        currentRevenueAgg,
        previousUsersAgg,
        previousTermsAgg,
        previousInvoicesAgg,
        previousRevenueAgg,
      ] = await Promise.all([
        // Current period: Users
        User.aggregate([
          { $match: { createdAt: { $gte: currentStartDate, $lte: currentEndDate } } },
          { $group: { _id: null, totalUsers: { $sum: 1 } } },
        ]),
        // Current period: Terms
        Term.aggregate([
          {
            $match: {
              $or: [
                { createdAt: { $gte: currentStartDate, $lte: currentEndDate } },
                { createdAt: { $exists: false } }, // Include terms without createdAt
              ],
            },
          },
          { $group: { _id: null, totalTerms: { $sum: 1 } } },
        ]).then((result) => {
          console.log(`Term aggregation for ${period} (start: ${currentStartDate}, end: ${currentEndDate}):`, result);
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
        // Previous period: Terms
        Term.aggregate([
          {
            $match: {
              $or: [
                { createdAt: { $gte: previousStartDate, $lt: previousEndDate } },
                { createdAt: { $exists: false } }, // Include terms without createdAt
              ],
            },
          },
          { $group: { _id: null, totalTerms: { $sum: 1 } } },
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
        totalTerms: currentTermsAgg[0]?.totalTerms || 0,
        totalInvoices: currentInvoicesAgg[0]?.totalInvoices || 0,
        totalRevenue: currentRevenueAgg[0]?.totalRevenue || 0,
      };

      // Lấy giá trị trước đó
      const previous = {
        totalUsers: previousUsersAgg[0]?.totalUsers || 0,
        totalTerms: previousTermsAgg[0]?.totalTerms || 0,
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
          title: "Total Users",
          value: current.totalUsers,
          percentageValue: calculatePercentage(current.totalUsers, previous.totalUsers),
          percentageType: current.totalUsers >= previous.totalUsers ? "increase" : "decrease",
        },
        {
          title: "Total Terms",
          value: current.totalTerms,
          percentageValue: calculatePercentage(current.totalTerms, previous.totalTerms),
          percentageType: current.totalTerms >= previous.totalTerms ? "increase" : "decrease",
        },
        {
          title: "Total Invoices",
          value: current.totalInvoices,
          percentageValue: calculatePercentage(current.totalInvoices, previous.totalInvoices),
          percentageType: current.totalInvoices >= previous.totalInvoices ? "increase" : "decrease",
        },
        {
          title: "Total Revenue",
          value: current.totalRevenue,
          percentageValue: calculatePercentage(current.totalRevenue, previous.totalRevenue),
          percentageType: current.totalRevenue >= previous.totalRevenue ? "increase" : "decrease",
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
  chartData: async (req, res, next) => {
    try {
      const { period } = req.query;
      if (!["day", "week", "month", "year"].includes(period)) {
        return res.status(400).json({
          success: false,
          message: "Invalid period. Use 'day', 'week', 'month', or 'year'.",
        });
      }

      const now = new Date();
      let startDate, endDate, groupBy;

      if (period === "day") {
        endDate = new Date(now);
        startDate = new Date(now.setDate(now.getDate() - 1));
        groupBy = { $hour: "$createdAt" }; // Group by hour for day
      } else if (period === "week") {
        endDate = new Date(now);
        startDate = new Date(now.setDate(now.getDate() - 7));
        groupBy = { $dayOfMonth: "$createdAt" };
      } else if (period === "month") {
        endDate = new Date(now);
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        groupBy = { $dayOfMonth: "$createdAt" };
      } else if (period === "year") {
        endDate = new Date(now);
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        groupBy = { $month: "$createdAt" };
      }

      const [
        dailyMetrics,
        invoiceStatus,
        termsByCard,
      ] = await Promise.all([
        // Daily/Hourly Metrics (Line Chart)
        Promise.all([
          User.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
              $group: {
                _id: groupBy,
                totalUsers: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
          Term.aggregate([
            {
              $match: {
                $or: [
                  { createdAt: { $gte: startDate, $lte: endDate } },
                  { createdAt: { $exists: false } },
                ],
              },
            },
            {
              $group: {
                _id: groupBy,
                totalTerms: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
          Invoice.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
              $group: {
                _id: groupBy,
                totalInvoices: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
          Invoice.aggregate([
            { $match: { status: "SUCCESS", createdAt: { $gte: startDate, $lte: endDate } } },
            {
              $group: {
                _id: groupBy,
                totalRevenue: { $sum: { $toDouble: "$amount" } },
              },
            },
            { $sort: { _id: 1 } },
          ]),
        ]),
        // Invoice Status (Pie Chart)
        Invoice.aggregate([
          { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
          {
            $group: {
              _id: "$status",
              totalAmount: { $sum: { $toDouble: "$amount" } },
            },
          },
        ]),

        Term.aggregate([{
          $match: {
            $or: [
              { createdAt: { $gte: startDate, $lte: endDate } },
              { createdAt: { $exists: false } },
            ],
          }
        },
        {
          $group: {
            _id: { cardId: "$cardId", time: groupBy },
            totalTerms: { $sum: 1 },
          }
        },
        { $sort: { "_id.time": 1 } },
        ])
      ]);


      // Format daily metrics
      const dailyData = dailyMetrics[0].map((user, i) => ({
        time: period === "day" ? `${user._id}:00` : period === "year" ? `Month ${user._id}` : `Day ${user._id}`,
        totalUsers: user.totalUsers || 0,
        totalTerms: dailyMetrics[1][i]?.totalTerms || 0,
        totalInvoices: dailyMetrics[2][i]?.totalInvoices || 0,
        totalRevenue: dailyMetrics[3][i]?.totalRevenue || 0,
      }));

      // Format invoice status
      const statusData = invoiceStatus.map((item) => ({
        status: item._id,
        value: item.totalAmount,
      }));

      // Format terms by card
      const cardData = termsByCard.reduce((acc, item) => {
        const time = period === "day" ? `${item._id.time}:00` : period === "year" ? `Month ${item._id.time}` : `Day ${item._id.time}`;
        let entry = acc.find((e) => e.time === time);
        if (!entry) {
          entry = { time };
          acc.push(entry);
        }
        entry[`card_${item._id.cardId}`] = item.totalTerms;
        return acc;
      }, []);

      return res.status(200).json({
        success: true,
        data: {
          dailyMetrics: dailyData,
          invoiceStatus: statusData,
          termsByCard: cardData,
        },
        time: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Lấy dữ liệu biểu đồ thất bại",
        error: error.message,
      });
    }
  },
};

module.exports = AdminController;