const Video = require('../models/Video');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to upload to Cloudinary
async function uploadToCloudinary(imageBase64) {
  try {
    // Remove data URI prefix if present
    const formattedImage = imageBase64.includes('data:image') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;
    
    const result = await cloudinary.uploader.upload(formattedImage, {
      resource_type: 'image'
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
}

// Helper function to generate script
async function generateScript(productName, tone) {
  // In a real app, you would use an AI service for this
  const tones = {
    enthusiastic: 'amazing, incredible, game-changing',
    professional: 'high-quality, efficient, reliable',
    casual: 'cool, awesome, handy',
    humorous: 'hilariously good, absurdly effective, ridiculously awesome'
  };
  
  const adjectives = tones[tone] || tones.enthusiastic;
  const [adj1, adj2, adj3] = adjectives.split(', ');
  
  return `Check out this ${adj1} ${productName}! It's the most ${adj2} solution you've been looking for. 
          I've been using it for weeks and it's absolutely ${adj3}. 
          You won't believe how much it has improved my daily routine!`;
}

// Helper function to create a talking avatar video
async function createTalkingAvatar(imageUrl, script) {
  // In a real app, you would call D-ID or similar service
  // For this example, we'll just return placeholder data
  return {
    result_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail_url: 'https://via.placeholder.com/300x500',
    duration: 30
  };
}

// @desc    Generate a video
// @route   POST /api/videos/generate
// @access  Private
const generateVideo = async (req, res) => {
  try {
    const { productName, imageUrl, avatarType, scriptTone } = req.body;

    // Validate input
    if (!productName || !imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Product name and image are required'
      });
    }

    // Check user's subscription and video usage
    const user = await User.findById(req.user._id);
    
    if (!user.subscription || user.subscription.videosUsed >= user.subscription.videosLimit) {
      return res.status(403).json({
        success: false,
        error: 'You have reached your video limit for this month',
        details: {
          current: user.subscription?.videosUsed || 0,
          limit: user.subscription?.videosLimit || 0,
          plan: user.subscription?.plan || 'none'
        }
      });
    }

    // Upload image to Cloudinary
    const presenterImageUrl = await uploadToCloudinary(imageUrl);

    // Generate script
    const script = await generateScript(productName, scriptTone || 'enthusiastic');

    // Create talking avatar video
    const videoResult = await createTalkingAvatar(presenterImageUrl, script);

    // Create video record in database
    const video = await Video.create({
      user: req.user._id,
      title: `${productName} Promotion`,
      description: `Promotional video for ${productName}`,
      videoUrl: videoResult.result_url,
      thumbnailUrl: videoResult.thumbnail_url,
      script,
      presenter: presenterImageUrl,
      settings: {
        avatarType: avatarType || 'professional',
        scriptTone: scriptTone || 'enthusiastic'
      },
      status: 'completed'
    });

    // Update user's video usage count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'subscription.videosUsed': 1 }
    });

    res.status(201).json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        script: video.script,
        createdAt: video.createdAt
      }
    });
  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate video'
    });
  }
};

// @desc    Get all user videos
// @route   GET /api/videos
// @access  Private
const getUserVideos = async (req, res) => {
  try {
    const videos = await Video.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: videos.length,
      videos: videos.map(video => ({
        id: video._id,
        title: video.title,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        script: video.script,
        status: video.status,
        createdAt: video.createdAt
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get video by ID
// @route   GET /api/videos/:id
// @access  Private
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }
    
    // Check if video belongs to user
    if (video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this video'
      });
    }
    
    res.json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        script: video.script,
        presenter: video.presenter,
        settings: video.settings,
        status: video.status,
        createdAt: video.createdAt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

module.exports = {
  generateVideo,
  getUserVideos,
  getVideoById
}; 