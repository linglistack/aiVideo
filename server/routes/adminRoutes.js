const express = require('express');
const router = express.Router();
const VisitorLog = require('../models/VisitorLog');
const aiUser = require('../models/aiUser');
const { protect, admin } = require('../middleware/authMiddleware');

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

module.exports = router; 