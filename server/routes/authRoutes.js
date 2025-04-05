const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleAuthUser, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');

// Register a new user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Google authentication
router.post('/google', googleAuthUser);

// Get user profile
router.get('/profile', protect, getUserProfile);

// Update user profile with Cloudinary avatar upload
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, phone, company } = req.body;
    const user = await require('../models/aiUser').findById(req.user._id);
    
    if (!user) {
      // Delete uploaded file if user not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
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
    
    // Handle avatar upload with Cloudinary
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'avatars',
          use_filename: false,
          unique_filename: true,
          overwrite: true,
          transformation: [
            { width: 250, height: 250, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        });
        
        console.log('Cloudinary upload result:', result);
        
        // If user already has an avatar on Cloudinary, delete the old one
        if (user.avatar && user.avatar.includes('cloudinary') && user.avatar.includes('/avatars/')) {
          try {
            // Extract public_id from the URL
            const publicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];
            if (publicId.startsWith('avatars/')) {
              await cloudinary.uploader.destroy(publicId);
              console.log('Old avatar deleted from Cloudinary:', publicId);
            }
          } catch (err) {
            console.error('Error deleting old avatar from Cloudinary:', err);
            // Continue even if deletion fails
          }
        }
        
        // Update the user's avatar with the Cloudinary URL
        user.avatar = result.secure_url;
        
        // Delete the temp file
        fs.unlinkSync(req.file.path);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        
        // Delete the temp file
        fs.unlinkSync(req.file.path);
        
        return res.status(500).json({
          success: false,
          error: 'Failed to upload image to cloud storage'
        });
      }
    }
    
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
        avatar: user.avatar,
        subscription: user.subscription
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
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