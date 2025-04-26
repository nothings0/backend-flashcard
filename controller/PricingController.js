const Pricing = require("../model/Pricing");

const PricingController = {
  // Get all pricing records
  async getPrices(req, res, next) {
    try {
      const prices = await Pricing.find({})
        .populate("price") // Populating the referenced Card model
        .lean(); // Using lean for performance
      return res.status(200).json({
        success: true,
        data: prices,
        count: prices.length,
      });
    } catch (error) {
      next(new Error("Failed to fetch prices"));
    }
  },

  // Create a new pricing record
  async createPrice(req, res, next) {
    try {
      const { title, description, type, price, discount } = req.body;

      // Input validation based on schema
      if (!type || !["MONTHLY", "YEARLY"].includes(type)) {
        return next(new Error("Valid type (MONTHLY, YEARLY) is required"));
      }
      if (discount && discount < 0) {
        return next(new Error("Discount cannot be negative"));
      }
      if (price && price < 0) {
        return next(new Error("price cannot be negative"));
      }

      const newPrice = await Pricing.create({
        title: title || "", // Using default from schema if not provided
        description: description || "",
        type,
        price: price || 0, // Optional, as schema doesn't require it
        discount: discount || 0,
      });

      return res.status(201).json({
        success: true,
        message: "Pricing created successfully",
        pricing: newPrice,
      });
    } catch (error) {
      next(new Error("Failed to create pricing"));
    }
  },

  // Update a pricing record
  async updatePrice(req, res, next) {
    try {
      const {id: _id} = req.params
      const { title, description, type, price, discount } = req.body;
      
      const pricing = await Pricing.findById(_id);
      
      if (!pricing) {
        return next(new Error("Pricing not found"));
      }

      // Input validation based on schema
      if (!type || !["MONTHLY", "YEARLY"].includes(type)) {
        return next(new Error("Valid type (MONTHLY, YEARLY) is required"));
      }
      if (discount && discount < 0) {
        return next(new Error("Discount cannot be negative"));
      }
      if (price && price < 0) {
        return next(new Error("price cannot be negative"));
      }

      const newPricing = await Pricing.findByIdAndUpdate(_id, {
        title: title || "", // Using default from schema if not provided
        description: description || "",
        type,
        price: Number(price) || 0, // Optional, as schema doesn't require it
        discount: Number(discount) || 0,
      }, {new: true});

      return res.status(201).json({
        success: true,
        message: "Pricing updated successfully",
        pricing: newPricing,
      });
    } catch (error) {
      next(new Error("Failed to update pricing"));
    }
  },

  // Delete pricing records
  async deletePrice(req, res, next) {
    try {
      const { id } = req.params;

      // Input validation
      if (!id) {
        return next(new Error("id is required to delete pricing"));
      }

      await Pricing.deleteOne({ _id: id });

      return res.status(200).json({
        success: true,
        message: "Pricing deleted successfully",
      });
    } catch (error) {
      next(new Error("Failed to delete pricing"));
    }
  }
}

module.exports = PricingController;