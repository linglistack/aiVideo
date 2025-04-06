const mongoose = require('mongoose');

/**
 * Visitor Log Schema
 * 
 * Tracks website visitors by IP address, including:
 * - IP address (anonymized for privacy)
 * - User agent details
 * - Timestamp in Eastern Time
 * - User ID (if logged in)
 * - Page/route visited
 * - Session ID (to track unique sessions)
 * - Country/region (derived from IP)
 */
const visitorLogSchema = new mongoose.Schema({
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    browser: String,
    version: String,
    os: String,
    device: String,
    fullString: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'aiUser',
    index: true
  },
  isAuthenticated: {
    type: Boolean,
    default: false
  },
  path: {
    type: String,
    default: '/'
  },
  referrer: String,
  sessionId: {
    type: String,
    index: true
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  duration: {
    type: Number,
    default: 0 // Duration in seconds, updated on session end
  },
  actions: [{
    type: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

// Create composite indexes for better query performance
visitorLogSchema.index({ ipAddress: 1, timestamp: 1 });
visitorLogSchema.index({ sessionId: 1, timestamp: 1 });

const VisitorLog = mongoose.model('VisitorLog', visitorLogSchema);

module.exports = VisitorLog; 