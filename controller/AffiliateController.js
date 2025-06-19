const Affiliate = require("../model/Affiliate");
const User = require("../model/User");

const AffiliateController = {
  // Get all affiliate records
  async getAll(req, res, next) {
    try {
      const affiliates = await Affiliate.find({})
        .populate("userId", "name email") // optional: chỉ lấy name/email từ user
        .lean();

      return res.status(200).json({
        success: true,
        data: affiliates,
        count: affiliates.length,
      });
    } catch (error) {
      next(new Error("Failed to fetch affiliates"));
    }
  },
  async verify(req, res, next) {
    try {
      const { referralCode } = req.query;

      const userId = req.user ? req.user._id : null;
      const affiliate = await Affiliate.findOne({ referralCode });

      if (!affiliate) {
        return res.status(404).json({
          success: false,
          data: null,
        });
      }
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          const existingAffiliate = await Affiliate.findOne({
            userId: user._id,
          });
          if (
            existingAffiliate &&
            existingAffiliate.referralCode === referralCode
          ) {
            return res.status(400).json({
              success: false,
              message: "Bạn không thể sử dụng mã giới thiệu này",
            });
          }
        }
      }

      return res.status(200).json({
        success: true,
        data: affiliate,
      });
    } catch (error) {
      next(error);
    }
  },

  // Create a new affiliate record
  async create(req, res, next) {
    try {
      const { userId, referralCode, discount } = req.body;

      if (!userId || !referralCode) {
        return next(new Error("userId and referralCode are required"));
      }

      const exists = await Affiliate.findOne({ referralCode });
      if (exists) {
        return next(new Error("Referral code already exists"));
      }

      const affiliate = await Affiliate.create({
        userId,
        referralCode,
        discount: discount || 10,
      });

      return res.status(201).json({
        success: true,
        message: "Affiliate created successfully",
        affiliate,
      });
    } catch (error) {
      next(new Error("Failed to create affiliate"));
    }
  },

  // Update an affiliate record
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { referralCode, discount, totalEarned } = req.body;

      const affiliate = await Affiliate.findById(id);
      if (!affiliate) {
        return next(new Error("Affiliate not found"));
      }

      // Check for duplicate code if changed
      if (referralCode && referralCode !== affiliate.referralCode) {
        const codeExists = await Affiliate.findOne({ referralCode });
        if (codeExists) {
          return next(new Error("Referral code already exists"));
        }
      }

      const updated = await Affiliate.findByIdAndUpdate(
        id,
        {
          referralCode: referralCode || affiliate.referralCode,
          discount: discount != null ? discount : affiliate.discount,
          totalEarned:
            totalEarned != null ? totalEarned : affiliate.totalEarned,
        },
        { new: true }
      );

      return res.status(200).json({
        success: true,
        message: "Affiliate updated successfully",
        affiliate: updated,
      });
    } catch (error) {
      next(new Error("Failed to update affiliate"));
    }
  },

  // Delete an affiliate record
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      if (!id) {
        return next(new Error("id is required to delete affiliate"));
      }

      await Affiliate.deleteOne({ _id: id });

      return res.status(200).json({
        success: true,
        message: "Affiliate deleted successfully",
      });
    } catch (error) {
      next(new Error("Failed to delete affiliate"));
    }
  },

  async generateAffiliateForAllUsers(req, res, next) {
    try {
      const users = await User.find({}).lean();

      let createdCount = 0;

      for (const user of users) {
        const exists = await Affiliate.findOne({ userId: user._id });

        if (!exists) {
          let code;
          let codeExists;

          // Đảm bảo mã giới thiệu không trùng
          do {
            code = generateReferralCode();
            codeExists = await Affiliate.findOne({ referralCode: code });
          } while (codeExists);

          await Affiliate.create({
            userId: user._id,
            referralCode: code,
            discount: 10,
            totalEarned: 0,
          });

          createdCount++;
        }
      }

      return res.status(200).json({
        success: true,
        message: `Đã tạo affiliate cho ${createdCount} người dùng.`,
      });
    } catch (error) {
      next(error);
    }
  },
};

const generateReferralCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

module.exports = AffiliateController;
