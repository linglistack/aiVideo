const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { 
  generateVideo, 
  getUserVideos, 
  getVideoById 
} = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');

// D-ID API configuration
const DID_API_URL = 'https://api.d-id.com';
const DID_API_KEY = process.env.DID_API_KEY;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Add request logging middleware
router.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Validate environment variables
if (!DID_API_KEY) {
    console.error('DID_API_KEY is not set in environment variables');
}

const didApi = axios.create({
    baseURL: DID_API_URL,
    headers: {
        'Authorization': `Basic ${Buffer.from(process.env.DID_API_KEY).toString('base64')}`,
        // or if using Bearer token:
        // 'Authorization': `Bearer ${process.env.DID_API_KEY}`,
        'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
});

// Generate script using Deepseek LLM
async function generateScript(productName) {
    // Implementation for Deepseek LLM
    const prompt = `Create an engaging 30-second TikTok script promoting ${productName}. 
                   Make it trendy and appealing to Gen Z audience.`;
    
    // Note: Replace with actual Deepseek implementation
    // This is a placeholder
    return `Check out this amazing ${productName}! 
            You won't believe what it can do...`;
}

// Helper function to upload image to Cloudinary
async function uploadToCloudinary(base64Image) {
    try {
        // Remove the data:image/jpeg;base64, prefix if it exists
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`);
        return result.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image');
    }
}

// Add this helper function
async function validateImageHasFace(imageUrl) {
    // You could use a face detection API here, but for now let's add a user guidance message
    return {
        isValid: false,
        message: 'Please upload an image containing a clear, front-facing human face. Product images cannot be used directly with D-ID.'
    };
}

// Add this helper function
async function preprocessImage(imageUrl) {
    try {
        // Download the image from the URL
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        // Process image with sharp
        const processedBuffer = await sharp(buffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: 90,
                progressive: true
            })
            .toBuffer();

        // Generate signature for Cloudinary upload
        const timestamp = Math.round(new Date().getTime() / 1000);
        const signature = require('crypto')
            .createHash('sha1')
            .update(`timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`)
            .digest('hex');

        // Create form data with proper authentication
        const formData = new FormData();
        formData.append('file', processedBuffer, { filename: 'processed.jpg' });
        formData.append('api_key', process.env.CLOUDINARY_API_KEY);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);

        const uploadResponse = await axios.post(
            `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                }
            }
        );

        return uploadResponse.data.secure_url;
    } catch (error) {
        console.error('Image preprocessing error:', error.response?.data || error);
        throw new Error('Failed to process image: ' + (error.response?.data?.error?.message || error.message));
    }
}

// Create talking avatar using D-ID
async function createTalkingAvatar(imageUrl, script) {
    try {
        console.log('Making D-ID API request with:', {
            imageUrl: imageUrl.substring(0, 50) + '...',
            scriptLength: script.length
        });

        const payload = {
            source_url: imageUrl,
            script: {
                type: 'text',
                input: script,
                provider: {
                    type: 'microsoft',
                    voice_id: 'en-US-JennyNeural'
                }
            }
        };

        // Create the talk
        const createResponse = await didApi.post('/talks', payload);
        console.log('D-ID initial response:', createResponse.data);
        
        const talkId = createResponse.data.id;
        
        let result;
        let attempts = 0;
        const maxAttempts = 30;
        let delay = 2000;

        while (attempts < maxAttempts) {
            attempts++;
            const statusResponse = await didApi.get(`/talks/${talkId}`);
            result = statusResponse.data;
            console.log(`Poll attempt ${attempts}, status: ${result.status}`);

            switch (result.status) {
                case 'done':
                    return result;
                case 'created':
                case 'started':
                case 'processing':
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay = Math.min(delay * 1.5, 10000);
                    continue;
                case 'error':
                    // Properly handle the error object
                    console.error('D-ID processing error details:', result.error);
                    throw new Error(`D-ID processing error: ${JSON.stringify(result.error)}`);
                default:
                    console.log('Full response for unexpected status:', result);
                    throw new Error(`Unexpected status: ${result.status}`);
            }
        }

        throw new Error('Video generation timed out');
    } catch (error) {
        console.error('D-ID API Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            error: error
        });
        
        // Handle different types of errors
        if (error.response?.status === 401) {
            throw new Error('D-ID API authentication failed. Please check your API key.');
        } else if (error.response?.status === 400) {
            throw new Error(`D-ID API validation error: ${error.response.data?.description || error.message}`);
        } else if (error.message.includes('[object Object]')) {
            // If we get an object error, try to parse it properly
            const errorDetails = error.response?.data?.error || error.error || 'Unknown error';
            throw new Error(`D-ID API Error: ${JSON.stringify(errorDetails)}`);
        }
        
        throw new Error(`D-ID API Error: ${error.message}`);
    }
}

// Generate video route with improved error handling
router.post('/generate', protect, generateVideo);

// Get video status route
router.get('/status/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const response = await didApi.get(`/talks/${videoId}`);
        res.json({
            success: true,
            status: response.data.status,
            videoUrl: response.data.result_url
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all generated videos route (placeholder - you'll need to implement storage)
router.get('/list', async (req, res) => {
    try {
        // Implement your storage solution here
        res.json({
            success: true,
            videos: [] // Return list of generated videos
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add this test route to verify D-ID API authentication
router.get('/test-auth', async (req, res) => {
    try {
        const response = await didApi.get('/credits');
        res.json({
            success: true,
            credits: response.data
        });
    } catch (error) {
        console.error('D-ID Auth Test Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data || error.message
        });
    }
});

// Add this test route
router.get('/test-cloudinary', async (req, res) => {
    try {
        const formData = new FormData();
        formData.append('api_key', process.env.CLOUDINARY_API_KEY);
        formData.append('timestamp', Math.round(new Date().getTime() / 1000));

        const response = await axios.get(
            `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/usage`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(process.env.CLOUDINARY_API_KEY + ':' + process.env.CLOUDINARY_API_SECRET).toString('base64')}`
                }
            }
        );

        res.json({
            success: true,
            cloudinaryStatus: 'Connected',
            details: response.data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data
        });
    }
});

router.get('/', protect, getUserVideos);
router.get('/:id', protect, getVideoById);

module.exports = router; 