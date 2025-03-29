const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Starter', 'Growth', 'Scale']
  },
  description: {
    type: String,
    required: true
  },
  features: [{
    type: String
  }],
  monthlyPriceId: {
    type: String,
    required: true // Stripe Price ID for monthly billing
  },
  yearlyPriceId: {
    type: String,
    required: true // Stripe Price ID for yearly billing
  },
  monthlyPrice: {
    type: Number,
    required: true
  },
  yearlyPrice: {
    type: Number,
    required: true
  },
  videosLimit: {
    type: Number,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan; 