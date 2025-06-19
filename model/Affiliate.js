const mongoose = require('mongoose');

const AffiliateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  discount: {
    type: Number,
    default: 10 // tỷ lệ % giảm
  },
  totalEarned: {
    type: Number,
    default: 0 // tổng tiền đã kiếm được từ affiliate
  }
});

module.exports = mongoose.model('Affiliate', AffiliateSchema);
