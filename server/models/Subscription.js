const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'growth', 'scale'],
    default: 'free'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  creditsUsed: {
    type: Number,
    default: 0
  },
  creditsTotal: {
    type: Number,
    default: function() {
      // Set default limits based on plan
      switch (this.plan) {
        case 'free': return 2;
        case 'starter': return 10;
        case 'growth': return 30;
        case 'scale': return 100;
        default: return 0;
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  paymentId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to check if user has available credits
subscriptionSchema.methods.hasAvailableCredits = function() {
  return this.creditsUsed < this.creditsTotal;
};

// Method to increment credits used
subscriptionSchema.methods.incrementCreditsUsed = async function() {
  this.creditsUsed += 1;
  await this.save();
  return this.creditsUsed;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 