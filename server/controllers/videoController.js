const Video = require('../models/Video');
const User = require('../models/aiUser');
const Subscription = require('../models/Subscription');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { promisify } = require('util');
const execPromise = promisify(exec);
const os = require('os');

// Import sharp with error handling
let sharp;
try {
  sharp = require('sharp');
  console.log('Sharp module loaded successfully');
} catch (error) {
  console.error('Error loading sharp module:', error.message);
  sharp = null;
}

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

// Helper function to download an image and convert to base64
async function downloadImageAsBase64(imageUrl) {
  try {
    // Download the image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    // Convert to base64
    const base64Image = Buffer.from(response.data).toString('base64');
    // Create a proper data URI
    const mimeType = response.headers['content-type'] || 'image/jpeg';
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    throw new Error('Failed to download image');
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

// Helper function to clean up temporary files
const cleanupTempFiles = async (dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`Cleaned up temporary directory: ${dirPath}`);
  } catch (cleanupError) {
    console.error('Error cleaning up temp files:', cleanupError);
  }
};

// @desc    Generate a video
// @route   POST /api/videos/generate
// @access  Private
const generateVideo = async (req, res) => {
  try {
    const { prompt, imageUrl, phrase, isGeneratedImage } = req.body;

    // Validate input
    if (!prompt || !imageUrl || !phrase) {
      return res.status(400).json({
        success: false,
        error: 'Prompt, image, and phrase are required'
      });
    }

    // Check user's subscription and video usage
    const user = await User.findById(req.user._id);
    
    if (!user.subscription || user.subscription.creditsUsed >= user.subscription.creditsTotal) {
      return res.status(403).json({
        success: false,
        error: 'Credit limit reached',
        usage: {
          current: user.subscription?.creditsUsed || 0,
          limit: user.subscription?.creditsTotal || 0,
        }
      });
    }

    // Process the image - handle both base64 and external URLs
    let presenterImageUrl;
    
    if (imageUrl.startsWith('data:')) {
      // It's already a base64 image from user upload
      presenterImageUrl = await uploadToCloudinary(imageUrl);
    } else if (isGeneratedImage && imageUrl.startsWith('http')) {
      // It's an external URL from the Qwen API
      try {
        // Download and convert to base64
        const base64Image = await downloadImageAsBase64(imageUrl);
        // Upload to Cloudinary
        presenterImageUrl = await uploadToCloudinary(base64Image);
      } catch (error) {
        console.error('Error processing external image:', error);
        return res.status(400).json({
          success: false,
          error: 'Failed to process generated image'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid image format'
      });
    }

    // Generate script using the provided phrase
    const script = phrase;

    // Create talking avatar video
    const videoResult = await createTalkingAvatar(presenterImageUrl, script);

    // Create video record in database
    const video = await Video.create({
      user: req.user._id,
      title: `${prompt} Video`,
      description: `Video generated from prompt: ${prompt}`,
      videoUrl: videoResult.result_url,
      thumbnailUrl: videoResult.thumbnail_url,
      script,
      presenter: presenterImageUrl,
      settings: {
        avatarType: 'professional',
        scriptTone: 'enthusiastic',
        isGeneratedImage: isGeneratedImage || false,
        originalPrompt: prompt
      },
      status: 'completed'
    });

    // Update user's credit usage
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'subscription.creditsUsed': 1 }
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

// Helper function to download video
async function downloadVideo(videoUrl) {
  try {
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer'
    });
    
    // Create temp file path using OS temp directory
    const tempDir = path.join(os.tmpdir(), 'aivideo_tmp');
    await fs.mkdir(tempDir, { recursive: true });
    const filePath = path.join(tempDir, `temp_video_${Date.now()}.mp4`);
    
    // Save to temp file
    await fs.writeFile(filePath, response.data);
    return filePath;
  } catch (error) {
    console.error('Error downloading video:', error);
    throw new Error('Failed to download video');
  }
}

// Helper function to extract YouTube video ID
function extractYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper function to extract TikTok video ID
function extractTikTokVideoId(url) {
  const regExp = /^.*tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// Helper function to extract Instagram video ID
function extractInstagramVideoId(url) {
  const regExp = /^.*instagram\.com\/(?:p|reel)\/([^/?]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

// @desc    Transcribe and summarize a video
// @route   POST /api/videos/transcribe
// @access  Private
const transcribeAndSummarizeVideo = async (req, res) => {
  try {
    const { videoUrl } = req.body;
    
    // Validate input
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Video URL is required'
      });
    }
    
    // Check user's subscription and video usage
    const user = await User.findById(req.user._id);
    
    if (!user.subscription || user.subscription.creditsUsed >= user.subscription.creditsTotal) {
      return res.status(403).json({
        success: false,
        error: 'Credit limit reached',
        usage: {
          current: user.subscription?.creditsUsed || 0,
          limit: user.subscription?.creditsTotal || 0,
        }
      });
    }
    
    let transcription = '';
    let summary = '';
    
    // Use Google Gemini for transcription and summarization
    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });
    
    // Determine video type and prepare appropriate prompt
    let videoType = "video";
    let prompt = "";
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      videoType = "YouTube video";
      const videoId = extractYouTubeVideoId(videoUrl);
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid YouTube URL'
        });
      }
    } else if (videoUrl.includes('tiktok.com')) {
      videoType = "TikTok video";
      const videoId = extractTikTokVideoId(videoUrl);
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid TikTok URL'
        });
      }
    } else if (videoUrl.includes('instagram.com')) {
      videoType = "Instagram video";
      const videoId = extractInstagramVideoId(videoUrl);
      if (!videoId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Instagram URL'
        });
      }
    } else {
      videoType = "video";
    }
    
    // Create a rich prompt for Gemini to process the video
    prompt = `I need you to use your video understanding capabilities to analyze this ${videoType}: ${videoUrl}

Your task:
1. First WATCH the video completely - this is IMPORTANT
2. Create a detailed transcript of all spoken content, including speaker changes if applicable
3. Write a comprehensive summary of the key points and content
4. If you cannot access the video directly, please clearly state that and provide a generic response about transcription limitations

Format your response EXACTLY like this:

## Transcript
[Complete transcript of all spoken content]

## Summary
[Comprehensive summary of the video content and key points]`;

    // For YouTube videos, try to enhance the prompt with an iframe embedding
    if (videoType === "YouTube video") {
      const videoId = extractYouTubeVideoId(videoUrl);
      if (videoId) {
        prompt = `I need you to analyze this YouTube video with ID: ${videoId}
It can be viewed at: ${videoUrl}
Here is the embedding: <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Your task:
1. Create a detailed transcript of all spoken content in the video
2. Write a comprehensive summary of the key points and content
3. If you cannot access the video, please transcribe and summarize using your knowledge about the video based on its YouTube ID

Format your response EXACTLY like this:

## Transcript
[Complete transcript of all spoken content]

## Summary
[Comprehensive summary of the video content and key points]`;
      }
    }

    // Send to Gemini
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1, // Lower temperature for more accurate transcription
        maxOutputTokens: 8192,
      }
    });
    
    const response = result.response;
    const responseText = response.text();
    
    // Extract transcript and summary
    const transcriptMatch = responseText.match(/## Transcript\s*([\s\S]*?)(?=## Summary|$)/i);
    const summaryMatch = responseText.match(/## Summary\s*([\s\S]*?)(?=$)/i);
    
    transcription = transcriptMatch ? transcriptMatch[1].trim() : "Transcript not available";
    summary = summaryMatch ? summaryMatch[1].trim() : "Summary not available";
    
    // Check if the response suggests Gemini couldn't access the video
    const couldNotAccessIndicators = [
      "cannot access",
      "unable to access",
      "don't have access",
      "cannot watch",
      "unable to watch",
      "cannot view",
      "unable to view",
      "cannot directly access",
      "cannot process"
    ];
    
    const accessIssue = couldNotAccessIndicators.some(phrase => 
      transcription.toLowerCase().includes(phrase.toLowerCase()) || 
      summary.toLowerCase().includes(phrase.toLowerCase())
    );
    
    if (accessIssue) {
      return res.status(400).json({
        success: false,
        error: "The AI could not access or process the video content. Please try a different video or format."
      });
    }
    
    // Update user's credit usage
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'subscription.creditsUsed': 1 }
    });
    
    // Return the transcription and summary
    res.status(200).json({
      success: true,
      data: {
        transcription,
        summary,
        videoUrl
      }
    });
    
  } catch (error) {
    console.error('Video transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to transcribe video'
    });
  }
};

// @desc    Expand a script with Gemini
// @route   POST /api/videos/expand-script
// @access  Private
const expandScript = async (req, res) => {
  try {
    const { script } = req.body;
    
    // Validate input
    if (!script) {
      return res.status(400).json({
        success: false,
        error: 'Script is required'
      });
    }
    
    // Check user's subscription and usage
    const user = await User.findById(req.user._id);
    
    if (!user.subscription || user.subscription.creditsUsed >= user.subscription.creditsTotal) {
      return res.status(403).json({
        success: false,
        error: 'Credit limit reached',
        usage: {
          current: user.subscription?.creditsUsed || 0,
          limit: user.subscription?.creditsTotal || 0,
        }
      });
    }
    
    // Use Gemini to expand the script
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });
    
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `Expand this brief script idea into a concise, natural script with clear visual scenes. Keep it brief and realistic.

RULES:
- Write like a professional screenwriter, not AI
- Use MINIMAL dialogue, focusing on visual storytelling
- Be CONCISE - quality over quantity
- Avoid clichés, stilted language, and overly flowery descriptions
- Include only AUTHENTIC, real-world dialogue that actual humans would say
- Create 3-5 clear visual moments without explicitly labeling them as scenes
- Focus on SPECIFIC, CONCRETE details, not generalities
- Keep the same characters and tone throughout

Original idea:
"${script}"

Make it read like a real-world script treatment - short, focused, visual, and authentic. If the original is already well-developed, just enhance it slightly without overwriting the creator's vision.` }]
      }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1024,
      }
    });
    
    const expandedScript = result.response.text();
    
    // Update user's credit usage
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'subscription.creditsUsed': 1 }
    });
    
    // Return the expanded script
    res.status(200).json({
      success: true,
      expandedScript
    });
    
  } catch (error) {
    console.error('Script expansion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to expand script'
    });
  }
};

// @desc    Generate scene images from a script
// @route   POST /api/videos/generate-scenes
// @access  Private
const generateScenes = async (req, res) => {
  try {
    const { script, count = 5 } = req.body;
    
    // Validate input
    if (!script) {
      return res.status(400).json({
        success: false,
        error: 'Script is required'
      });
    }
    
    // Validate scene count
    const sceneCount = parseInt(count, 10);
    if (isNaN(sceneCount) || sceneCount < 3 || sceneCount > 10) {
      return res.status(400).json({
        success: false,
        error: 'Scene count must be between 3 and 10'
      });
    }
    
    // Check user's subscription and usage
    const user = await User.findById(req.user._id);
    
    if (!user.subscription || user.subscription.creditsUsed >= user.subscription.creditsTotal) {
      return res.status(403).json({
        success: false,
        error: 'Credit limit reached',
        usage: {
          current: user.subscription?.creditsUsed || 0,
          limit: user.subscription?.creditsTotal || 0,
        }
      });
    }
    
    // Use Gemini to identify key scenes
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });
    
    // First, identify the key scenes from the script
    const scenesResult = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `Analyze the following script and identify the ${sceneCount} most important scenes that tell the complete story.

"${script}"

IMPORTANT REQUIREMENTS:
1. Maintain consistent characters across all ${sceneCount} scenes - use the same names, appearance, and personality traits
2. Create a coherent progression where each scene builds on the previous ones
3. Extract specific visual details from the script to make each scene realistic and vivid
4. Focus on realistic, photographable scenes - nothing fantastical or impossible to capture in real photography
5. Provide specific locations, time of day, weather, and other environmental details

For each scene, provide:
1. A brief description (1-2 sentences)
2. A detailed photographic image prompt that would create a realistic, cinematic still frame

Format your response as a JSON array with exactly ${sceneCount} objects containing:
- "description": brief scene description
- "imagePrompt": detailed photographic prompt with characters, setting, lighting, camera angle, etc.

The ${sceneCount} scenes should collectively tell the complete story with consistent characters.` }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      }
    });
    
    const scenesText = scenesResult.response.text();
    let scenes = [];
    
    try {
      // Extract JSON from the response
      // This extracts anything between the first [ and the last ]
      const jsonMatch = scenesText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse scenes from response');
      }
    } catch (error) {
      console.error('Error parsing scenes from Gemini response:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process scenes from the script'
      });
    }
    
    // Generate images for each scene using Gemini
    const imageGenModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });
    
    const imagePromises = scenes.map(async (scene, index) => {
      try {
        const imageResult = await imageGenModel.generateContent({
          contents: [{ 
            role: "user", 
            parts: [{ text: `Generate a photorealistic image that looks like a still frame from a movie for this scene:

${scene.imagePrompt}

REQUIREMENTS:
- Create a PHOTOREALISTIC image that looks exactly like a photograph taken with a real camera
- Use natural lighting and realistic shadows
- Include authentic textures, materials, and environmental details
- Ensure realistic human proportions and expressions
- Avoid any AI artifacts, strange hands, or unnatural elements
- Apply cinematography techniques with proper depth of field
- Use realistic color grading like actual film
- Make it indistinguishable from a real photograph from a film set

This MUST look like a frame from an actual movie or TV show that was filmed with real actors and real locations - not computer generated.` }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseModalities: ["Text", "Image"],
          }
        });
        
        const response = imageResult.response;
        
        if (response.candidates && response.candidates.length > 0) {
          const parts = response.candidates[0].content.parts;
          
          // Look for inline image data
          for (const part of parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
              return {
                ...scene,
                imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
              };
            }
          }
        }
        
        throw new Error(`Failed to generate image for scene ${index + 1}`);
      } catch (error) {
        console.error(`Error generating image for scene ${index + 1}:`, error);
        // Return a placeholder for failed images
        return {
          ...scene,
          imageUrl: 'https://placehold.co/600x400/black/white?text=Image+Generation+Failed'
        };
      }
    });
    
    const sceneImagesResults = await Promise.allSettled(imagePromises);
    const sceneImages = sceneImagesResults
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    // Update user's credit usage (count as one credit per image)
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'subscription.creditsUsed': sceneCount }
    });
    
    // Return the scenes with their images
    res.status(200).json({
      success: true,
      scenes: sceneImages
    });
    
  } catch (error) {
    console.error('Scene generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate scene images'
    });
  }
};

// @desc    Regenerate a scene image
// @route   POST /api/videos/regenerate-scene-image
// @access  Private
const regenerateSceneImage = async (req, res) => {
  try {
    const { imagePrompt } = req.body;
    
    // Validate input
    if (!imagePrompt) {
      return res.status(400).json({
        success: false,
        error: 'Image prompt is required'
      });
    }
    
    // Check user's subscription and usage
    const user = await User.findById(req.user._id);
    
    if (!user.subscription || user.subscription.creditsUsed >= user.subscription.creditsTotal) {
      return res.status(403).json({
        success: false,
        error: 'Credit limit reached',
        usage: {
          current: user.subscription?.creditsUsed || 0,
          limit: user.subscription?.creditsTotal || 0,
        }
      });
    }
    
    // Use Gemini to generate a new image
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const imageGenModel = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });
    
    try {
      const imageResult = await imageGenModel.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: `Generate a photorealistic image that looks like a still frame from a movie for this scene:

${imagePrompt}

REQUIREMENTS:
- Create a PHOTOREALISTIC image that looks exactly like a photograph taken with a real camera
- Use natural lighting and realistic shadows
- Include authentic textures, materials, and environmental details
- Ensure realistic human proportions and expressions
- Avoid any AI artifacts, strange hands, or unnatural elements
- Apply cinematography techniques with proper depth of field
- Use realistic color grading like actual film
- Make it indistinguishable from a real photograph from a film set

This MUST look like a frame from an actual movie or TV show that was filmed with real actors and real locations - not computer generated.` }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseModalities: ["Text", "Image"],
        }
      });
      
      const response = imageResult.response;
      
      if (response.candidates && response.candidates.length > 0) {
        const parts = response.candidates[0].content.parts;
        
        // Look for inline image data
        for (const part of parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            // Update user's credit usage
            await User.findByIdAndUpdate(req.user._id, {
              $inc: { 'subscription.creditsUsed': 1 }
            });
            
            // Return the image
            return res.status(200).json({
              success: true,
              imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            });
          }
        }
      }
      
      throw new Error('Failed to generate image');
      
    } catch (error) {
      console.error('Image generation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate image'
      });
    }
    
  } catch (error) {
    console.error('Scene image regeneration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to regenerate scene image'
    });
  }
};

// @desc    Create a video from scene images
// @route   POST /api/videos/create-video-from-scenes
// @access  Private
const createVideoFromScenes = async (req, res) => {
  try {
    const { scenes } = req.body;
    
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Scenes array is required'
      });
    }
    
    // Add memory debugging logs
    const initialMemory = process.memoryUsage();
    console.log('Memory usage before processing:', {
      rss: `${Math.round(initialMemory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(initialMemory.heapTotal / 1024 / 1024)} MB`, 
      heapUsed: `${Math.round(initialMemory.heapUsed / 1024 / 1024)} MB`
    });
    console.log(`Processing ${scenes.length} scenes...`);
    
    // Create unique ID for this video
    const videoId = uuidv4();
    const tempDir = path.join(os.tmpdir(), 'aivideo_tmp', videoId);
    const framesDir = path.join(tempDir, 'frames');
    
    // Create temp directories
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(framesDir, { recursive: true });
    
    console.log(`Created temp directories: ${tempDir}`);
    
    // Save each image to disk with consistent dimensions
    const frameFiles = [];
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const frameFile = path.join(framesDir, `frame_${i.toString().padStart(3, '0')}.png`);
      frameFiles.push(frameFile);
      
      try {
        let imageBuffer;
        
        // Convert data URL to buffer
        if (scene.imageUrl.startsWith('data:')) {
          const base64Data = scene.imageUrl.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
          console.log(`Converted frame ${i} from data URL to buffer`);
        } else {
          // If it's a URL, download it
          const response = await axios({
            method: 'GET',
            url: scene.imageUrl,
            responseType: 'arraybuffer'
          });
          imageBuffer = Buffer.from(response.data);
          console.log(`Downloaded frame ${i} from URL to buffer`);
        }
        
        // Process image to ensure consistent dimensions
        if (sharp) {
          // Process with sharp to reduce dimensions and save memory (640x360)
          await sharp(imageBuffer)
            .resize({
              width: 640,  // Reduced resolution for memory efficiency
              height: 360, // Reduced resolution for memory efficiency
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 1 }
            })
            .toFile(frameFile);
          console.log(`Processed frame ${i} with sharp for consistent dimensions (640x360)`);
        } else {
          // Fallback to direct file write if sharp is not available
          await fs.writeFile(frameFile, imageBuffer);
          console.log(`Saved frame ${i} without processing (sharp not available)`);
        }
      } catch (frameError) {
        console.error(`Error processing frame ${i}:`, frameError.message);
        throw new Error(`Error processing image ${i}: ${frameError.message}`);
      }
    }
    
    console.log(`Processed and saved ${frameFiles.length} frames with consistent dimensions`);
    
    // Log memory after processing images
    const afterImagesMemory = process.memoryUsage();
    console.log('Memory usage after processing images:', {
      rss: `${Math.round(afterImagesMemory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(afterImagesMemory.heapTotal / 1024 / 1024)} MB`, 
      heapUsed: `${Math.round(afterImagesMemory.heapUsed / 1024 / 1024)} MB`
    });
    
    // Create a simpler version of the video using FFmpeg
    // Use simpler FFmpeg approach - just show each image for 3 seconds
    const outputVideoPath = path.join(tempDir, 'output.mp4');
    
    try {
      // List all files in the frames directory
      console.log(`Frames directory contents:`);
      const framesList = await fs.readdir(framesDir);
      console.log(framesList);
      
      // Use a memory-optimized FFmpeg command for Render hosting
      // Lower resolution, ultrafast preset, and minimal memory usage
      const ffmpegCmd = `ffmpeg -y -f image2 -framerate 1/3 -i "${framesDir}/frame_%03d.png" -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1" -c:v libx264 -preset ultrafast -tune fastdecode -crf 28 -pix_fmt yuv420p -r 15 "${outputVideoPath}"`;
      
      console.log(`Running FFmpeg command: ${ffmpegCmd}`);
      
      const { stdout, stderr } = await execPromise(ffmpegCmd);
      console.log('FFmpeg stdout:', stdout);
      console.log('FFmpeg stderr:', stderr);
      
      // Check if the output file was created
      const stats = await fs.stat(outputVideoPath);
      console.log(`Output video created: ${outputVideoPath}, size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error('Output video file is empty');
      }
    } catch (ffmpegError) {
      console.error('FFmpeg error:', ffmpegError.message);
      console.error('FFmpeg stderr:', ffmpegError.stderr);
      
      // Try a simpler fallback approach
      try {
        console.log('Trying fallback FFmpeg approach');
        
        // Create an even more memory-efficient fallback command
        const fallbackCmd = `ffmpeg -y -f image2 -i "${framesDir}/frame_%03d.png" -vf "scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=1/3" -c:v libx264 -preset ultrafast -crf 30 -tune zerolatency -pix_fmt yuv420p "${outputVideoPath}"`;
        console.log(`Running fallback FFmpeg command: ${fallbackCmd}`);
        
        const { stdout, stderr } = await execPromise(fallbackCmd);
        console.log('Fallback FFmpeg stdout:', stdout);
        console.log('Fallback FFmpeg stderr:', stderr);
        
        const stats = await fs.stat(outputVideoPath);
        if (stats.size === 0) {
          throw new Error('Fallback output video file is empty');
        }
      } catch (fallbackError) {
        console.error('Fallback FFmpeg error:', fallbackError.message);
        console.error('Fallback FFmpeg stderr:', fallbackError.stderr);
        throw new Error(`Failed to create video with FFmpeg: ${fallbackError.message}`);
      }
    }
    
    // Log memory before Cloudinary upload
    const preUploadMemory = process.memoryUsage();
    console.log('Memory usage before Cloudinary upload:', {
      rss: `${Math.round(preUploadMemory.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(preUploadMemory.heapTotal / 1024 / 1024)} MB`, 
      heapUsed: `${Math.round(preUploadMemory.heapUsed / 1024 / 1024)} MB`
    });
    
    // Upload to Cloudinary
    try {
      console.log('Uploading video to Cloudinary');
      const videoResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          outputVideoPath,
          { 
            resource_type: 'video',
            folder: 'scene-videos',
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              console.log('Cloudinary upload success:', result.secure_url);
              resolve(result);
            }
          }
        );
      });
      
      // Create a record in the database
      const video = await Video.create({
        user: req.user._id,
        title: `Scene Video ${new Date().toISOString().slice(0, 10)}`,
        description: 'Created from generated scenes',
        videoUrl: videoResult.secure_url,
        thumbnailUrl: videoResult.secure_url.replace('.mp4', '.jpg'),
        settings: {
          source: 'scene-images',
          sceneCount: scenes.length
        },
        status: 'completed'
      });
      
      // Update user's credit usage (1 credit for video creation)
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'subscription.creditsUsed': 1 }
      });
      
      // Final memory usage
      const finalMemory = process.memoryUsage();
      console.log('Final memory usage:', {
        rss: `${Math.round(finalMemory.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(finalMemory.heapTotal / 1024 / 1024)} MB`, 
        heapUsed: `${Math.round(finalMemory.heapUsed / 1024 / 1024)} MB`
      });
      
      // Clean up temp files after successful upload
      cleanupTempFiles(tempDir);
      
      // Return success response
      res.status(200).json({
        success: true,
        videoUrl: videoResult.secure_url,
        videoId: video._id
      });
    } catch (uploadError) {
      console.error('Video upload error:', uploadError);
      throw new Error(`Failed to upload video: ${uploadError.message}`);
    }
    
  } catch (error) {
    console.error('Video creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create video from scenes'
    });
  }
};

module.exports = {
  generateVideo,
  getUserVideos,
  getVideoById,
  transcribeAndSummarizeVideo,
  expandScript,
  generateScenes,
  regenerateSceneImage,
  createVideoFromScenes
}; 