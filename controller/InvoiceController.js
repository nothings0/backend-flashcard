const Invoice = require("../model/Invoice");
const User = require("../model/User");

const PricingController = {
    async webhooksepay(req, res, next) {
        const { refCode, amount, status } = req.body;

        try {
            if (!refCode || !status) {
                return res.status(400).send("Missing required fields");
            }

            const invoice = await Invoice.findOne({ refCode });
            if (!invoice) {
                return res.status(404).send("Invoice not found");
            }

            // Tránh xử lý lại invoice đã thanh toán thành công
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
                let endDate = new Date(now);

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

            res.status(200).send("Webhook processed successfully");
        } catch (error) {
            next(error)
        }
    },
    async createInvoice(req, res) {
        const userId = req.user._id; // Lấy userId từ token đã xác thực
        const { planType, amount } = req.body;

        if (!userId || !planType || !amount) {
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "Không tìm thấy người dùng." });
            }

            // Tạo refCode ngẫu nhiên 6 ký tự
            const refCode = crypto.randomBytes(3).toString('hex').toUpperCase();

            const newInvoice = new Invoice({
                userId,
                planType,
                amount,
                refCode,
                status: "PENDING"
            });

            await newInvoice.save();

            // Tùy bạn kết nối hệ thống nào, ở đây mình trả về refCode để frontend sinh QR code hoặc hiển thị
            return res.status(201).json({
                message: "Tạo hóa đơn thành công.",
                invoice: {
                    id: newInvoice._id,
                    refCode: newInvoice.refCode,
                    amount: newInvoice.amount,
                    status: newInvoice.status,
                    planType: newInvoice.planType
                }
            });

        } catch (err) {
            next(err);
        }
    },

    async getInvoice(req, res, next) {
        const { id } = req.params;

        try {
            const invoice = await Invoice.findById(id);
            if (!invoice) {
                return res.status(404).json({ message: "Invoice not found" });
            }

            res.status(200).json({ invoice });
        } catch (error) {
            next(err);
        }
    },
};

module.exports = PricingController;
