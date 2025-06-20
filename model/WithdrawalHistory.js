const mongoose = require('mongoose');

const WithdrawalHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  code: {
    type: String,
    default: null,
    required: true,
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  processedAt: Date,
  rejectedAt: Date
}, {timestamps: true});

module.exports = mongoose.model('WithdrawalHistory', WithdrawalHistorySchema);