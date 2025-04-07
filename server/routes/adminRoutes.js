const express = require('express');
const router = express.Router();
const VisitorLog = require('../models/VisitorLog');
const aiUser = require('../models/aiUser');
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/aiUser');
const SubscriptionLog = require('../models/SubscriptionLog');
const Payment = require('../models/Payment');
const mongoose = require('mongoose');

/**
 * @desc    Get visitor logs with filtering options
 * @route   GET /api/admin/visitors
 * @access  Private/Admin
 */
router.get('/visitors', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    
    // Build filter object based on query parameters
    const filter = {};
    
    // Filter by date range
    if (req.query.startDate) {
      filter.timestamp = { $gte: new Date(req.query.startDate) };
    }
    
    if (req.query.endDate) {
      filter.timestamp = { ...filter.timestamp, $lte: new Date(req.query.endDate) };
    }
    
    // Filter by IP address
    if (req.query.ip) {
      filter.ipAddress = { $regex: req.query.ip, $options: 'i' };
    }
    
    // Filter by path
    if (req.query.path) {
      filter.path = { $regex: req.query.path, $options: 'i' };
    }
    
    // Filter by authentication status
    if (req.query.authenticated) {
      filter.isAuthenticated = req.query.authenticated === 'true';
    }
    
    // Count total records for pagination
    const total = await VisitorLog.countDocuments(filter);
    
    // Get visitor logs with pagination
    const logs = await VisitorLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');
    
    res.json({
      success: true,
      count: logs.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      logs
    });
  } catch (error) {
    console.error('Error fetching visitor logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor logs'
    });
  }
});

/**
 * @desc    Get summary statistics of visitor activity
 * @route   GET /api/admin/visitors/stats
 * @access  Private/Admin
 */
router.get('/visitors/stats', protect, admin, async (req, res) => {
  try {
    // Use timeframe from query or default to last 30 days
    const timeframe = req.query.timeframe || '30';
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeframe));
    
    // Get total visitor count
    const totalVisitors = await VisitorLog.countDocuments({
      timestamp: { $gte: daysAgo }
    });
    
    // Get unique visitor count (by IP)
    const uniqueVisitors = await VisitorLog.distinct('ipAddress', {
      timestamp: { $gte: daysAgo }
    }).then(ips => ips.length);
    
    // Get authenticated visitor count
    const authenticatedVisitors = await VisitorLog.countDocuments({
      timestamp: { $gte: daysAgo },
      isAuthenticated: true
    });
    
    // Get count by path (top 10)
    const pathCounts = await VisitorLog.aggregate([
      { $match: { timestamp: { $gte: daysAgo } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get daily visitor counts for chart
    const dailyCounts = await VisitorLog.aggregate([
      { $match: { timestamp: { $gte: daysAgo } } },
      { 
        $group: { 
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } 
          }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      timeframe: parseInt(timeframe),
      stats: {
        totalVisitors,
        uniqueVisitors,
        authenticatedVisitors,
        dailyCounts,
        topPaths: pathCounts
      }
    });
  } catch (error) {
    console.error('Error fetching visitor statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch visitor statistics'
    });
  }
});

/**
 * @desc    Get users with recent activity
 * @route   GET /api/admin/users/activity
 * @access  Private/Admin
 */
router.get('/users/activity', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Get users sorted by lastVisitedTime
    const users = await aiUser.find({
      lastVisitedTime: { $ne: null }
    })
    .select('name email avatar lastVisitedTime createdAt role subscription')
    .sort({ lastVisitedTime: -1 })
    .skip(skip)
    .limit(limit);
    
    // Count total for pagination
    const total = await aiUser.countDocuments({
      lastVisitedTime: { $ne: null }
    });
    
    res.json({
      success: true,
      count: users.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      users
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    });
  }
});

/**
 * @desc    Get inactive users (no login in last 30 days)
 * @route   GET /api/admin/users/inactive
 * @access  Private/Admin
 */
router.get('/users/inactive', protect, admin, async (req, res) => {
  try {
    const daysAgo = parseInt(req.query.days) || 30;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    const users = await aiUser.find({
      $or: [
        { lastVisitedTime: { $lt: date } },
        { lastVisitedTime: null }
      ]
    })
    .select('name email createdAt lastVisitedTime subscription')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      inactiveDays: daysAgo,
      users
    });
  } catch (error) {
    console.error('Error fetching inactive users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inactive users'
    });
  }
});

// Get subscription logs
router.get('/subscription-logs', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      eventType, 
      userId, 
      successful,
      page = 0,
      limit = 20
    } = req.query;
    
    // Build query filters
    const query = {};
    
    if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      if (query.createdAt) {
        query.createdAt.$lte = new Date(endDate);
      } else {
        query.createdAt = { $lte: new Date(endDate) };
      }
    }
    
    if (eventType) {
      query.eventType = eventType;
    }
    
    if (userId) {
      query.userId = mongoose.Types.ObjectId.isValid(userId) ? 
        mongoose.Types.ObjectId(userId) : userId;
    }
    
    if (successful !== undefined) {
      query.successful = successful === 'true';
    }
    
    // Get total count of matching documents
    const total = await SubscriptionLog.countDocuments(query);
    
    // Get paginated results
    const logs = await SubscriptionLog.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(page) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();
    
    // If logs are found, add user email to each log
    const logsWithUserInfo = await Promise.all(
      logs.map(async (log) => {
        try {
          const user = await User.findById(log.userId).select('email').lean();
          return {
            ...log,
            userEmail: user ? user.email : 'Unknown'
          };
        } catch (err) {
          return {
            ...log,
            userEmail: 'Error fetching user'
          };
        }
      })
    );
    
    res.json({
      success: true,
      logs: logsWithUserInfo,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching subscription logs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription logs'
    });
  }
});

// Get subscription statistics
router.get('/subscription-stats', async (req, res) => {
  try {
    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get total subscriptions
    const totalSubscriptions = await User.countDocuments({
      'subscription.plan': { $ne: 'free' }
    });
    
    // Get active subscriptions
    const activeSubscriptions = await User.countDocuments({
      'subscription.isActive': true,
      'subscription.plan': { $ne: 'free' }
    });
    
    // Get cancelled subscriptions
    const cancelledSubscriptions = await User.countDocuments({
      $or: [
        { 'subscription.cancelAtPeriodEnd': true },
        { 'subscription.isCanceled': true }
      ],
      'subscription.plan': { $ne: 'free' }
    });
    
    // Get revenue this month
    const payments = await Payment.find({
      status: 'complete',
      createdAt: { $gte: monthStart }
    });
    
    const revenueThisMonth = payments.reduce((sum, payment) => {
      return sum + (payment.amount || 0);
    }, 0);
    
    // Get count of failed payments this month
    const failedPaymentsCount = await Payment.countDocuments({
      status: 'failed',
      createdAt: { $gte: monthStart }
    });
    
    res.json({
      success: true,
      stats: {
        totalSubscriptions,
        activeSubscriptions,
        cancelledSubscriptions,
        revenueThisMonth,
        failedPaymentsCount
      }
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription statistics'
    });
  }
});

// Get upcoming renewals (next 7 days)
router.get('/upcoming-renewals', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    const users = await User.find({
      'subscription.isActive': true,
      'subscription.paymentType': 'recurring',
      'subscription.endDate': {
        $gte: now,
        $lte: sevenDaysFromNow
      }
    }).lean();
    
    // Format the data for frontend
    const renewals = await Promise.all(users.map(async (user) => {
      const isYearly = user.subscription.billingCycle === 'yearly';
      
      return {
        _id: user._id,
        userEmail: user.email,
        planName: user.subscription.plan,
        amount: isYearly ? user.subscription.actualPrice : user.subscription.price,
        renewalDate: user.subscription.endDate,
        billingCycle: user.subscription.billingCycle
      };
    }));
    
    res.json({
      success: true,
      renewals
    });
  } catch (error) {
    console.error('Error fetching upcoming renewals:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch upcoming renewals'
    });
  }
});

// Get recent failed payments
router.get('/failed-payments', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const failedPayments = await Payment.find({
      status: 'failed',
      createdAt: { $gte: thirtyDaysAgo }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
    
    // Add user email to each payment
    const paymentsWithUserInfo = await Promise.all(
      failedPayments.map(async (payment) => {
        try {
          const user = await User.findById(payment.userId).select('email').lean();
          return {
            ...payment,
            userEmail: user ? user.email : 'Unknown'
          };
        } catch (err) {
          return {
            ...payment,
            userEmail: 'Error fetching user'
          };
        }
      })
    );
    
    res.json({
      success: true,
      payments: paymentsWithUserInfo
    });
  } catch (error) {
    console.error('Error fetching failed payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch failed payments'
    });
  }
});

// Manually retry a failed payment
router.post('/retry-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Find the payment
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }
    
    // Check if payment is in a failed state
    if (payment.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Can only retry failed payments'
      });
    }
    
    // Find the user
    const user = await User.findById(payment.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    let retryResult = { success: false };
    
    // Attempt retry based on provider
    if (payment.provider === 'stripe' && payment.stripePaymentIntentId) {
      const stripeService = require('../services/stripeService');
      retryResult = await stripeService.retryPayment(payment.stripePaymentIntentId);
    } else if (payment.provider === 'paypal' && user.subscription.paypalSubscriptionId) {
      const paypalService = require('../services/paypalService');
      retryResult = await paypalService.retrySubscriptionPayment(user.subscription.paypalSubscriptionId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Cannot retry payment: missing required provider information'
      });
    }
    
    // Update payment record
    payment.retryCount = (payment.retryCount || 0) + 1;
    payment.lastRetryDate = new Date();
    
    if (retryResult.success) {
      payment.status = 'complete';
      payment.retrySuccessDate = new Date();
      
      // Log success
      const SubscriptionLog = require('../models/SubscriptionLog');
      await SubscriptionLog.create({
        userId: user._id,
        eventType: 'payment_retry_success',
        description: `Manually retried payment successfully (Admin: ${req.user.email})`,
        planName: user.subscription.plan,
        billingCycle: user.subscription.billingCycle,
        paymentProvider: payment.provider,
        subscriptionId: payment.provider === 'paypal' ? user.subscription.paypalSubscriptionId : user.subscription.stripeSubscriptionId,
        paymentId: payment._id,
        amount: payment.amount,
        successful: true
      });
      
      // Try to send email notification
      try {
        const emailService = require('../services/emailService');
        await emailService.sendPaymentRetrySuccessEmail(user.email, {
          name: user.name,
          planName: user.subscription.plan,
          amount: payment.amount,
          date: new Date()
        });
      } catch (emailError) {
        console.error('Error sending payment retry success email:', emailError);
      }
    } else {
      // Log failure
      const SubscriptionLog = require('../models/SubscriptionLog');
      await SubscriptionLog.create({
        userId: user._id,
        eventType: 'payment_retry_failed',
        description: `Manually retried payment failed (Admin: ${req.user.email}): ${retryResult.error}`,
        planName: user.subscription.plan,
        billingCycle: user.subscription.billingCycle,
        paymentProvider: payment.provider,
        subscriptionId: payment.provider === 'paypal' ? user.subscription.paypalSubscriptionId : user.subscription.stripeSubscriptionId,
        paymentId: payment._id,
        amount: payment.amount,
        successful: false,
        errorMessage: retryResult.error
      });
    }
    
    await payment.save();
    
    res.json({
      success: retryResult.success,
      message: retryResult.success ? 'Payment retry successful' : 'Payment retry failed',
      error: retryResult.error,
      payment
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry payment'
    });
  }
});

module.exports = router; 