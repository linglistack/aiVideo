const aiUser = require('../models/aiUser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// User object formatter to include payment method info
const formatUserResponse = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    googleId: user.googleId,
    role: user.role,
    avatar: user.avatar || null,
    subscription: user.subscription,
    paymentMethod: user.paymentMethod || null,
    hasPassword: Boolean(user.password),
    token: user.token || generateToken(user._id),
  };
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await aiUser.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Create user
    const user = await aiUser.create({
      name,
      email,
      password,
      subscription: {
        plan: 'free',
        startDate: Date.now(),
        videosLimit: 2
      }
    });

    if (user) {
      res.status(201).json({
        success: true,
        user: formatUserResponse(user)
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    // Get email and password from request body
    const { email, password } = req.body;
    
    // Debug - log what's being received (without showing full password)
    console.log("Login request received for email:", email);
    console.log("Password provided:", password ? "Yes" : "No");
    
    // Check for user email
    const user = await aiUser.findOne({ email });
    console.log("User found:", user ? "Yes" : "No");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    // Special case for OAuth users without a password trying to use password login
    if (user.googleId && !user.password && password) {
      return res.status(401).json({
        success: false,
        error: 'This account uses Google login. Please log in with Google or set a password in your account settings.'
      });
    }
    
    // Check if password matches - skip for Google OAuth users if they don't have a password set
    if (password) {
      const isMatch = await user.matchPassword(password);
      console.log("Password match:", isMatch ? "Yes" : "No");
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
    } else if (!user.googleId) {
      // If no password provided and not a Google user, they need to provide a password
      return res.status(401).json({
        success: false,
        error: 'Password is required'
      });
    }
    
    // Add token to user object for formatter function
    user.token = generateToken(user._id);
    
    // User authenticated, send back user data
    res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await aiUser.findById(req.user._id);

    if (user) {
      res.json({
        success: true,
        user: formatUserResponse(user)
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// @desc    Google OAuth Authentication
// @route   POST /api/auth/google
// @access  Public
const googleAuthUser = async (req, res) => {
  try {
    const { tokenId } = req.body;
    
    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of your app
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;
    
    // Check if user exists
    let user = await aiUser.findOne({ email });
    
    if (!user) {
      // Create new user if doesn't exist
      user = await aiUser.create({
        name,
        email,
        googleId: sub,
        avatar: picture,
        subscription: {
          plan: 'free',
          startDate: Date.now(),
          videosLimit: 2
        }
      });
    } else if (!user.googleId) {
      // If user exists but doesn't have Google ID, update it
      user.googleId = sub;
      if (!user.avatar && picture) {
        user.avatar = picture;
      }
      await user.save();
    }
    
    // Add token to user object for formatter function
    user.token = generateToken(user._id);
    
    // Return user data and token
    res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error',
    });
  }
};

// Export functions
module.exports = {
  registerUser,
  loginUser,
  googleAuthUser,
  getUserProfile,
}; 