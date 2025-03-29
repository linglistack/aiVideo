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
  videosUsed: {
    type: Number,
    default: 0
  },
  videosLimit: {
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

// Method to check if user has available videos
subscriptionSchema.methods.hasAvailableVideos = function() {
  return this.videosUsed < this.videosLimit;
};

// Method to increment videos used
subscriptionSchema.methods.incrementVideosUsed = async function() {
  this.videosUsed += 1;
  await this.save();
  return this.videosUsed;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription; 