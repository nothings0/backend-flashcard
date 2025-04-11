const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  gateway: {
    type: String,
    required: true
  },
  transaction_date: {
    type: Date,
    required: true,
    default: new Date(0)
  },
  account_number: {
    type: String,
    default: null
  },
  sub_account: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  code: {
    type: String,
    default: null
  },
  transaction_content: {
    type: String,
    default: null
  },
  reference_number: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planType: {
    type: String,
    enum: ['MONTHLY', 'YEARLY'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
    default: 'PENDING'
  },
  paidAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
