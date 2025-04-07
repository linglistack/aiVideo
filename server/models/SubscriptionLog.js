const mongoose = require('mongoose');

const subscriptionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'aiUser',
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'subscription_created',
      'subscription_updated',
      'subscription_cancelled',
      'payment_succeeded',
      'payment_failed',
      'payment_retry_success',
      'payment_retry_failed',
      'cycle_reset',
      'cycle_reset_failed',
      'renewal_notice_sent',
      'subscription_expired',
      'plan_changed',
      'credits_updated'
    ]
  },
  description: {
    type: String,
    required: true
  },
  planName: {
    type: String
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'none', null]
  },
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', 'manual', null]
  },
  subscriptionId: {
    type: String
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  amount: {
    type: Number
  },
  successful: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object
  }
});

// Add indexes for common queries
subscriptionLogSchema.index({ userId: 1, createdAt: -1 });
subscriptionLogSchema.index({ eventType: 1, createdAt: -1 });
subscriptionLogSchema.index({ successful: 1 });
subscriptionLogSchema.index({ createdAt: 1 });

const SubscriptionLog = mongoose.model('SubscriptionLog', subscriptionLogSchema);

module.exports = SubscriptionLog; 