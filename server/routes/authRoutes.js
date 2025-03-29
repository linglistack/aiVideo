const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleAuthUser, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Register a new user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Google authentication
router.post('/google', googleAuthUser);

// Get user profile
router.get('/profile', protect, getUserProfile);

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, company } = req.body;
    const user = await require('../models/aiUser').findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (company) user.company = company;
    
    await user.save();
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        role: user.role,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
});

// Change password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Please log in again.'
      });
    }
    
    console.log(`Processing password change for user: ${req.user._id}`);
    
    const aiUser = require('../models/aiUser');
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Special case: If user has Google OAuth but no password yet, they can set a password
    // without providing a current password
    const isOAuthUser = user.googleId;
    const hasPassword = Boolean(user.password);
    
    // If it's a Google OAuth user setting password for the first time, skip current password check
    if (isOAuthUser && !hasPassword) {
      console.log('OAuth user setting a password for the first time');
      
      // Set new password
      user.password = newPassword;
      await user.save();
      
      return res.json({
        success: true,
        message: 'Password set successfully! You can now log in with either Google or email.',
        hasPassword: true
      });
    }
    
    // For users with an existing password, verify the current password
    if (hasPassword) {
      // Check if current password matches
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password is required'
        });
      }
      
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
    }
    
    // Set new password
    user.password = newPassword;
    await user.save();
    
    // Return hasPassword flag so the frontend knows the user now has a password
    res.json({
      success: true,
      message: 'Password updated successfully',
      hasPassword: true
    });
  } catch (error) {
    console.error('Password change error:', error);
    
    // Check for specific error types
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please log in again.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Your session has expired. Please log in again.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
});

// Logout - clear server-side cookies
router.post('/logout', (req, res) => {
  // Clear the JWT cookie if it exists
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/'
  });
  
  // Clear any other auth cookies your app might use
  res.clearCookie('auth', { path: '/' });
  res.clearCookie('session', { path: '/' });
  
  console.log('Server: cleared auth cookies');
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router; 