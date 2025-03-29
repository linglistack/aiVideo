const jwt = require('jsonwebtoken');
const aiUser = require('../models/aiUser');

// Middleware to protect routes - requires authentication
exports.protect = async (req, res, next) => {
  let token;
  
  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      
      // Additional check for token validity
      if (!token || token === 'undefined' || token === 'null') {
        console.log('Invalid token format received:', token);
        return res.status(401).json({
          success: false,
          error: 'Not authorized, invalid token format'
        });
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from the token
      req.user = await aiUser.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.log('User not found for token ID:', decoded.id);
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
      
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed'
      });
    }
  } else {
    console.log('No authorization header or Bearer token found');
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token'
    });
  }
};

// Middleware to check if user is admin
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Not authorized as an admin'
    });
  }
};

// Optional middleware to continue even if not authenticated
exports.optional = async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await aiUser.findById(decoded.id).select('-password');
    } catch (error) {
      console.error('Token validation error (optional auth):', error.message);
      // Not setting req.user - will be undefined
    }
  }
  
  // Continue regardless of auth status
  next();
}; 