const Affiliate = require("../model/Affiliate");
const Invoice = require("../model/Invoice");
const User = require("../model/User");
const crypto = require("crypto");
const WithdrawalHistory = require("../model/WithdrawalHistory");

const Pagination = (req) => {
  let page = Number(req.query.page) * 1 || 1;
  let limit = Number(req.query.limit) * 1 || 4;
  let skip = (page - 1) * limit || 0;

  return { page, limit, skip };
};

const PricingController = {
  async webhooksepay(req, res, next) {
    const {
      gateway,
      transactionDate,
      accountNumber,
      subAccount,
      transferAmount,
      content,
      id,
      description,
      transferType,
    } = req.body;
    if (transferType === "in") {
      try {
          console.log("codePayment:", content, id, transferAmount, transactionDate, accountNumber, subAccount, description);
        if (!content || !id) {
          return res.status(400).send("Missing required code | id fields");
        }

        const codePayment = content.match(/SEVQR\s+([A-Z0-9]+)/)?.[1] || null;

        if (!codePayment) {
          return res.status(400).send("Missing codePayment");
        }

        const invoice = await Invoice.findOne({ code: codePayment }); // dùng đúng tên field
        if (!invoice) {
          return res.status(404).send("Invoice not found");
        }

        if (invoice.status === "SUCCESS") {
          return res.status(200).send("Invoice already processed");
        }

        if (id) {
          if (invoice.amount !== transferAmount) {
            return res.status(400).send("Invalid amount");
          }
          invoice.status = "SUCCESS";
          (invoice.gateway = gateway),
            (invoice.transaction_date = transactionDate),
            (invoice.account_number = accountNumber),
            (invoice.sub_account = subAccount),
            (invoice.description = description),
            (invoice.content = content),
            await invoice.save();

          const user = await User.findById(invoice.userId);
          if (!user) {
            return res.status(404).send("User not found");
          }

          const now = new Date();
          const endDate = new Date(now);

          switch (invoice.planType) {
            case "MONTHLY":
              endDate.setMonth(endDate.getMonth() + 1);
              break;
            case "YEARLY":
              endDate.setFullYear(endDate.getFullYear() + 1);
              break;
            default:
              return res.status(400).send("Invalid plan type");
          }

          user.plan = {
            type: invoice.planType,
            startDate: now,
            endDate,
          };
          await user.save();

          if (invoice.referralCode) {
            const affiliate = await Affiliate.findOne({
              referralCode: invoice.referralCode,
            });
            if (affiliate) {
              affiliate.totalEarned =
                (affiliate.totalEarned || 0) +
                invoice.amount * affiliate.discount;
              await affiliate.save();
            }
          }
        } else {
          invoice.status = "FAILED";
          await invoice.save();
        }

        return res.status(200).send("Webhook processed successfully");
      } catch (error) {
        next(error);
      }
    } else {
      try {
        if (!content || !id) {
          return res.status(400).send("Missing required code | id fields");
        }

        const codePayment = content.match(/SEVQR\s+([A-Z0-9]+)/)?.[1] || null;
        if (!codePayment) {
          return res.status(400).send("Missing required codePayment");
        }

        const invoice = await WithdrawalHistory.findOne({ code: codePayment }); // dùng đúng tên field
        if (!invoice) {
          return res.status(404).send("Invoice not found");
        }

        if (invoice.status === "SUCCESS") {
          return res.status(200).send("Invoice already processed");
        }

        if (id) {
          if (invoice.amount !== transferAmount) {
            return res.status(400).send("Invalid amount");
          }
          invoice.status = "SUCCESS";
          invoice.processedAt = transactionDate;
          await invoice.save();
        } else {
          invoice.status = "REJECTED";
          invoice.rejectedAt = new Date();
          await invoice.save();

          const affiliate = await Affiliate.findOne({
            userId: invoice.userId,
          });

          affiliate.totalEarned = invoice.amount

          await affiliate.save();
        }

        return res.status(200).send("Webhook processed successfully");
      } catch (error) {
        next(error);
      }
    }
  },

  async createInvoice(req, res, next) {
    const userId = req.user._id;
    const { planType, amount, referralCode } = req.body;

    if (!userId || !planType || !amount) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy người dùng." });
      }

      if (user.plan && user.plan.type !== "FREE") {
        const endDate = new Date(user.plan.endDate);
        const now = new Date();
        const isExpired = endDate < now;

        if (!isExpired) {
          return res.status(400).json({
            msg: `Bạn đã đăng ký gói ${
              user.plan.type === "MONTHLY"
                ? "tháng trước đó rồi"
                : "năm trước đó rồi"
            }`,
            code: 400,
          });
        }
      }

      const code = crypto.randomBytes(3).toString("hex").toUpperCase();

      const newInvoice = new Invoice({
        userId,
        planType,
        gateway: "sepay",
        transaction_date: null,
        account_number: null,
        sub_account: null,
        referralCode: referralCode,
        amount: amount,
        code: code,
        transaction_content: `Mua gói bởi ${user.username}`,
        description: `Đăng ký gói ${planType}`,
        status: "PENDING",
      });

      await newInvoice.save();

      return res.status(201).json({
        message: "Tạo hóa đơn thành công.",
        invoice: {
          id: newInvoice._id,
          code: newInvoice.code,
          amount: parseFloat(newInvoice.amount.toString()),
          planType: newInvoice.planType,
          status: newInvoice.status,
        },
        code: 201,
      });
    } catch (err) {
      console.error(err);
      next(new Error("Không thể tạo hóa đơn."));
    }
  },

  async getInvoice(req, res, next) {
    const { id } = req.params;

    try {
      const invoice = await Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      return res.status(200).json({ invoice });
    } catch (err) {
      next(err);
    }
  },

  async getInvoices(req, res, next) {
    const { limit } = Pagination(req);

    try {
      const invoices = await Invoice.find().limit(5);

      if (invoices.length === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      return res.status(200).json({ invoices });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = PricingController;
