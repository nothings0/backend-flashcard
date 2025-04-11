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
  amount_in: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    default: 0.00
  },
  amount_out: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    default: 0.00
  },
  accumulated: {
    type: mongoose.Schema.Types.Decimal128,
    required: true,
    default: 0.00
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
