const Invoice = require("../model/Invoice");
const User = require("../model/User");
const crypto = require('crypto');

const PricingController = {
  async webhooksepay(req, res, next) {
    const { refCode, amount, status } = req.body;

    try {
      if (!refCode || !status) {
        return res.status(400).send("Missing required fields");
      }

      const invoice = await Invoice.findOne({ code: refCode }); // dùng đúng tên field
      if (!invoice) {
        return res.status(404).send("Invoice not found");
      }

      if (invoice.status === "SUCCESS") {
        return res.status(200).send("Invoice already processed");
      }

      if (status === "SUCCESS") {
        invoice.status = "SUCCESS";
        invoice.paidAt = new Date();
        await invoice.save();

        const user = await User.findById(invoice.userId);
        if (!user) {
          return res.status(404).send("User not found");
        }

        const now = new Date();
        const endDate = new Date(now);

        switch (invoice.planType) {
          case 'MONTHLY':
            endDate.setMonth(endDate.getMonth() + 1);
            break;
          case 'YEARLY':
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;
          default:
            return res.status(400).send("Invalid plan type");
        }

        user.plan = {
          type: invoice.planType,
          startDate: now,
          endDate
        };
        await user.save();
      } else {
        invoice.status = "FAILED";
        await invoice.save();
      }

      return res.status(200).send("Webhook processed successfully");
    } catch (error) {
      next(error);
    }
  },

  async createInvoice(req, res, next) {
    const userId = req.user._id;
    const { planType, amount } = req.body;

    if (!userId || !planType || !amount) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }

    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
      }

      const refCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const now = new Date();

      const newInvoice = new Invoice({
        userId,
        planType,
        gateway: 'sepay',
        transaction_date: now,
        account_number: null,
        sub_account: null,
        amount: amount,
        code: refCode,
        transaction_content: `Mua gói ${planType} bởi ${user.username}`,
        reference_number: null,
        description: `Đăng ký gói ${planType}`,
        status: 'PENDING'
      });

      await newInvoice.save();

      return res.status(201).json({
        message: 'Tạo hóa đơn thành công.',
        invoice: {
          id: newInvoice._id,
          refCode: newInvoice.code,
          amount: parseFloat(newInvoice.amount.toString()),
          planType: newInvoice.planType,
          status: newInvoice.status,
        },
      });
    } catch (err) {
      console.error(err);
      next(new Error('Không thể tạo hóa đơn.'));
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
};

module.exports = PricingController;
