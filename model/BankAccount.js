const mongoose = require('mongoose');

const BankAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: true
  },
  bankAccountNumber: {
    type: String,
    required: true
  }
}, {timestamps: true});

module.exports = mongoose.model('BankAccount', BankAccountSchema);
