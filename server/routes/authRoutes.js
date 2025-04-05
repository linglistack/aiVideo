const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleAuthUser, getUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Register a new user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Google auth
router.post('/google', googleAuthUser);

// Update user profile with Cloudinary avatar upload
router.put('/profile', protect, upload.single('avatar'), async (req, res) => {
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
    
    // Handle avatar upload with Cloudinary
    if (req.file) {
      try {
        // Upload buffer to Cloudinary directly
        const result = await cloudinary.uploader.upload_stream({
          folder: 'avatars',
          use_filename: false,
          unique_filename: true,
          overwrite: true,
          transformation: [
            { width: 250, height: 250, crop: 'fill', gravity: 'face' },
            { quality: 'auto' }
          ]
        }, async (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({
              success: false,
              error: 'Failed to upload image to cloud storage'
            });
          }
          
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
        }).end(req.file.buffer);
        
        // Return early as the response is handled in the upload_stream callback
        return;
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        
        return res.status(500).json({
          success: false,
          error: 'Failed to upload image to cloud storage'
        });
      }
    } else {
      // If no file was uploaded, just save the user and return
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
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
});

// Get user profile
router.get('/profile', protect, getUserProfile);

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

// Delete user account
router.delete('/delete-account', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(`Processing account deletion for user: ${userId}`);
    
    // Get user model
    const aiUser = require('../models/aiUser');
    
    // Find the user
    const user = await aiUser.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // If user has an active subscription, cancel it first
    if (user.subscription && user.subscription.isActive && user.subscription.stripeSubscriptionId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        // Cancel the subscription in Stripe
        await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);
        console.log(`Canceled Stripe subscription for user ${userId}`);
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError);
        // Continue with deletion even if subscription cancellation fails
      }
    }
    
    // If user has a Cloudinary avatar, delete it
    if (user.avatar && user.avatar.includes('cloudinary') && user.avatar.includes('/avatars/')) {
      try {
        const cloudinary = require('cloudinary').v2;
        // Extract public_id from the URL
        const publicId = user.avatar.split('/').slice(-2).join('/').split('.')[0];
        if (publicId.startsWith('avatars/')) {
          await cloudinary.uploader.destroy(publicId);
          console.log('User avatar deleted from Cloudinary');
        }
      } catch (cloudinaryError) {
        console.error('Error deleting avatar from Cloudinary:', cloudinaryError);
        // Continue with user deletion even if avatar deletion fails
      }
    }
    
    // Delete any videos associated with this user
    try {
      const Video = require('../models/Video');
      await Video.deleteMany({ user: userId });
      console.log(`Deleted all videos for user ${userId}`);
    } catch (videoError) {
      console.error('Error deleting user videos:', videoError);
      // Continue with user deletion even if video deletion fails
    }
    
    // Delete any payment records
    try {
      const Payment = require('../models/Payment');
      await Payment.deleteMany({ userId });
      console.log(`Deleted all payment records for user ${userId}`);
    } catch (paymentError) {
      console.error('Error deleting payment records:', paymentError);
      // Continue with user deletion even if payment record deletion fails
    }
    
    // Finally, delete the user
    await aiUser.findByIdAndDelete(userId);
    console.log(`User ${userId} has been successfully deleted`);
    
    res.json({
      success: true,
      message: 'Your account has been permanently deleted'
    });
    
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error while deleting account'
    });
  }
});

module.exports = router; 