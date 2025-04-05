const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'aiUser',
    required: true,
    index: true
  },
  paymentId: {
    type: String,
    required: true
  },
  invoiceId: {
    type: String
  },
  subscriptionId: {
    type: String
  },
  customerId: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  plan: {
    type: String,
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  status: {
    type: String,
    enum: ['succeeded', 'pending', 'failed'],
    default: 'pending'
  },
  receiptUrl: {
    type: String
  },
  receiptNumber: {
    type: String
  },
  paymentMethod: {
    id: String,
    brand: String,
    last4: String,
    expMonth: String,
    expYear: String
  },
  metadata: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add index for faster queries
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ date: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment; 