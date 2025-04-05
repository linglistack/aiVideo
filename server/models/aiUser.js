const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const aiUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only if not using Google auth
    }
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  stripeCustomerId: {
    type: String
  },
  paymentMethod: {
    id: String,
    last4: String,
    brand: String,
    expMonth: String,
    expYear: String,
    nameOnCard: String,
    createdAt: Date
  },
  paymentMethods: [{
    id: String,
    last4: String,
    brand: String,
    expMonth: String,
    expYear: String,
    nameOnCard: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'growth', 'scale'],
      default: 'free'
    },
    stripeSubscriptionId: {
      type: String
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    cycleStartDate: {
      type: Date
    },
    cycleEndDate: {
      type: Date
    },
    creditsUsed: {
      type: Number,
      default: 0
    },
    creditsTotal: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: false
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly', 'none'],
      default: 'none'
    },
    canceledAt: {
      type: Date
    },
    pendingDowngrade: {
      plan: {
        type: String,
        enum: ['free', 'starter', 'growth', 'scale']
      },
      scheduledDate: {
        type: Date
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to hash password
aiUserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
aiUserSchema.methods.matchPassword = async function(enteredPassword) {
  console.log("matchPassword called");
  console.log("Entered password type:", typeof enteredPassword);
  console.log("Stored password exists:", !!this.password);
  
  // If no password stored (e.g., Google OAuth user)
  if (!this.password) return false;
  
  // Compare using bcrypt
  try {
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    console.log("Password match result:", isMatch);
    return isMatch;
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
};

const aiUser = mongoose.model('aiUser', aiUserSchema);

module.exports = aiUser; 