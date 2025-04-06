const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs').promises;
const path = require('path');
const { 
  generateVideo, 
  getUserVideos, 
  getVideoById 
} = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');

// D-ID API configuration
const DID_API_URL = 'https://api.d-id.com';
const DID_API_KEY = process.env.DID_API_KEY;

// DeepSeek API Configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Google Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
if (!DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY is not set in environment variables');
}
if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set in environment variables');
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

// Google Gemini API - Generate images
async function generateImages(prompt, count = 4) {
    try {
        console.log('Calling Google Gemini API to generate images');
        
        if (!GEMINI_API_KEY) {
            throw new Error('No GEMINI_API_KEY provided. Cannot generate images.');
        }
        
        // Enhanced prompts for better image generation - focusing on realistic photography
        const enhancedPrompts = [
            `Real-world photograph of ${prompt}. Authentic documentary-style photography, natural lighting, no AI artifacts, candid shot with high resolution, exactly like a professional photographer would take.`,
            `Professional stock photography of ${prompt}. Photojournalistic style, realistic details, authentic textures, shot on Canon 5D, no digital enhancements, looks like Getty Images.`,
            `Commercial product shot of ${prompt}. Studio lighting, realistic shadows, detailed textures, shot on a high-end DSLR, minimal post-processing, like a catalog photograph.`,
            `Lifestyle photo of ${prompt} in natural environment. Candid photography, authentic details, natural colors, realistic lighting, appears unedited like a real photograph.`
        ];
        
        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp"
        });
        
        // Define function to generate a single image with Gemini
        async function generateSingleImage(enhancedPrompt, index) {
            console.log(`Generating image ${index + 1} with prompt: ${enhancedPrompt.substring(0, 50)}...`);
            
            const result = await model.generateContent({
                contents: [{ 
                    role: "user", 
                    parts: [{ text: `Create a realistic photograph of: ${enhancedPrompt}. 
                    
This should look like a real photograph taken with a camera, not AI-generated art. Focus on:
- Realistic lighting and shadows
- Natural textures and details
- Proper perspective and proportions
- No AI artifacts or unnatural blending
- No text or watermarks

The image should be indistinguishable from a real photograph you'd find in a magazine or professional photography website.` }]
                }],
                generationConfig: {
                    temperature: 0.1, // Lower temperature for more realistic output
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 8192,
                    responseModalities: ["Text", "Image"], // Use responseModalities instead of tools
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_ONLY_HIGH"
                    }
                ]
            });
            
            const response = result.response;
            
            if (response.candidates && response.candidates.length > 0) {
                const parts = response.candidates[0].content.parts;
                
                // Look for inline image data
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                        console.log(`Successfully generated inline image ${index + 1}!`);
                        
                        // Create temporary directory if it doesn't exist
                        const tmpDir = path.join(process.cwd(), 'tmp');
                        await fs.mkdir(tmpDir, { recursive: true });
                        
                        // Save image to temporary file
                        const imageFileName = `gemini_${Date.now()}_${index}.png`;
                        const imagePath = path.join(tmpDir, imageFileName);
                        await fs.writeFile(imagePath, Buffer.from(part.inlineData.data, 'base64'));
                        
                        // Upload to Cloudinary
                        const uploadResult = await cloudinary.uploader.upload(imagePath);
                        
                        // Delete temporary file
                        await fs.unlink(imagePath);
                        
                        console.log(`Image ${index + 1} uploaded to Cloudinary: ${uploadResult.secure_url}`);
                        return uploadResult.secure_url;
                    }
                }
                
                // If no images were found, check for any text responses
                for (const part of parts) {
                    if (part.text) {
                        console.log(`Received text response instead of image for prompt ${index + 1}:`, part.text.substring(0, 100) + '...');
                    }
                }
                
                // Check for function calls - indicates API key doesn't have direct image gen capability
                for (const part of parts) {
                    if (part.functionCall && part.functionCall.name === 'generate_image') {
                        const functionPrompt = part.functionCall.args.prompt;
                        console.log(`Gemini is requesting to generate image with prompt: ${functionPrompt}`);
                        
                        throw new Error('Your Gemini API key does not have access to direct image generation. The model is calling a function to generate an image, but this feature requires a different tier of API access. Please upgrade your API key or use a different image generation service.');
                    }
                }
            }
            
            console.log(`No usable image generated for prompt ${index + 1}`);
            throw new Error('Image generation failed - no image found in response');
        }
        
        // Generate images in parallel (only up to the count requested)
        const imagePromises = enhancedPrompts.slice(0, count).map(generateSingleImage);
        
        // Wait for all image generations to complete or fail
        const results = await Promise.allSettled(imagePromises);
        
        // Filter out only the successful generations
        const imageUrls = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        console.log(`Successfully generated ${imageUrls.length} images out of ${count} requested`);
        
        if (imageUrls.length === 0) {
            throw new Error('Failed to generate any images with Gemini');
        }
        
        return imageUrls;
    } catch (error) {
        console.error('Image generation error:', error.message);
        throw error; // No fallback, propagate the error
    }
}

// Generate fallback images using Cloudinary or another source
async function generateFallbackImages(prompt, count) {
    try {
        // Create pure transparent images with text overlay only
        return Promise.all(
            Array(count).fill().map((_, index) => {
                // Create a transparent base with just text overlay
                return cloudinary.url('placeholder/transparent', {
                    transformation: [
                        // Use a transparent background explicitly
                        { width: 800, height: 800, crop: 'fill', background: 'transparent' },
                        { 
                            overlay: {
                                font_family: 'Arial',
                                font_size: 80, // Larger text
                                font_weight: 'bold',
                                text: encodeURIComponent(prompt)
                            },
                            color: 'ffffff',
                            effect: "shadow:40:0:0:0:black", // Add slight shadow to text for readability
                            gravity: "center"
                        }
                    ]
                });
            })
        );
    } catch (err) {
        console.error('Error generating fallback images:', err);
        // Ultimate fallback with pure transparency
        return Array(count).fill().map(() => 
            `https://placehold.co/800x800/transparent/white?text=${encodeURIComponent(prompt)}`
        );
    }
}

// DeepSeek API - Generate phrases with emojis
async function generatePhrases(prompt) {
    try {
        console.log('Calling DeepSeek API to generate phrases with emojis');
        
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: `You write simple, casual text for social media posts. Your style is just like a real person typing on their phone - not a corporate marketer or AI assistant.

Create 4 short phrases about "${prompt}" that sound totally natural, like what your friend would text you.

Rules:
- Keep it super simple and casual (like a text message)
- Use everyday words anyone would use in conversation
- Add 2-3 emojis placed naturally (like real people use them in texts)
- Sound like a real person, not a marketer or AI
- No corporate or formal language
- No cheesy marketing phrases
- Keep each phrase short (5-8 words max)
- NEVER use square brackets [], asterisks *, tildes ~, or any markdown formatting
- NEVER use strikethrough, underline, or any other text formatting
- Only use common, well-supported emojis
- No quotation marks

Examples of GOOD phrases:
- Just tried this coffee ☕ so good! 🤩
- Can't stop thinking about these shoes 👟 need them!
- Beach day with the fam 🏖️ best day ever 🌞
- This pasta recipe 🍝 changed my life 😍

Examples of BAD phrases:
- "Experience the innovative solution to your problems!"
- "The premium choice for discerning customers."
- "[Check this out] it's amazing!"
- "~~Old way~~ NEW way to do things"
- "This is *so* important to try"`
                    },
                    {
                        role: "user",
                        content: `Write 4 short phrases about ${prompt} that sound like a real person texting their friend. Keep it casual, simple, and natural with 2-3 emojis that flow naturally in the text.

Each phrase should be different:
1. Something excited or enthusiastic
2. Something helpful or with a tip
3. Something funny or playful
4. Something that shares an honest opinion

DO NOT use square brackets [], asterisks *, tildes ~, or any formatting characters. Just plain text with emojis.

ONLY give me the 4 numbered phrases - nothing else. No explanations or introductions.`
                    }
                ],
                max_tokens: 500,
                temperature: 0.8,
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Extract the phrases from the response and clean them up
        const assistantMessage = response.data.choices[0].message.content;
        console.log('DeepSeek raw response:', assistantMessage);
        
        const phrasesArray = assistantMessage
            .split('\n')
            .filter(line => line.trim().match(/^\d+[\.\)]\s/)) // Match lines starting with numbers followed by . or )
            .map(line => line.replace(/^\d+[\.\)]\s+/, '').trim()) // Remove the numbering
            .map(phrase => phrase.replace(/["'""'']/g, '')) // Remove any kind of quotation marks
            .map(phrase => phrase.replace(/^[""'']/g, '').replace(/[""'']$/g, '')) // Remove quotes at start/end
            .map(phrase => phrase.replace(/[\[\]\*~_]/g, '')) // Remove markdown formatting characters
            .map(phrase => phrase.replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{Emoji}\p{Emoji_Component}]/gu, '')) // Keep only letters, numbers, punctuation, spaces, and valid emojis
            .map(phrase => phrase.charAt(0).toUpperCase() + phrase.slice(1)); // Capitalize first letter
        
        console.log('Extracted phrases with emojis:', phrasesArray);
        
        // Ensure we have exactly 4 phrases
        const finalPhrases = phrasesArray.length >= 4 
            ? phrasesArray.slice(0, 4) 
            : [...phrasesArray, ...Array(4 - phrasesArray.length).fill().map((_, i) => {
                // Fallback phrases with emojis naturally placed throughout - more casual and conversational
                const fallbacks = [
                    `OMG this ${prompt} is so good 😍 need it!`,
                    `Just got this ${prompt} 🙌 game changer!`,
                    `You gotta try this ${prompt} 🔥 trust me`,
                    `Never going back after trying this ${prompt} 💯`
                ];
                return fallbacks[i + phrasesArray.length] || `This ${prompt} tho 🤩 so amazing!`;
            })];
        
        return finalPhrases;
    } catch (error) {
        console.error('DeepSeek API error:', error.response?.data || error.message);
        // Fallback phrases with emojis naturally distributed if API fails - more casual style
        return [
            `OMG this ${prompt} is so good 😍 need it!`,
            `Just got this ${prompt} 🙌 game changer!`,
            `You gotta try this ${prompt} 🔥 trust me`,
            `Never going back after trying this ${prompt} 💯`
        ];
    }
}

// Process and upload an image using multer for file upload handling
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to generate variations based on an uploaded image
async function generateVariationsFromUpload(imageUrl, prompt) {
    try {
        console.log('Generating variations based on uploaded image:', imageUrl);
        
        if (!GEMINI_API_KEY) {
            throw new Error('No GEMINI_API_KEY provided. Cannot generate image variations.');
        }
        
        // Initialize Gemini API
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp" 
        });
        
        // Create enhanced prompts for better variations
        const enhancedPrompts = [
            `Create a similar image to this but with different angle and lighting. Make it look like a real photograph of ${prompt}.`,
            `Generate a variation of this image with a different background but keep the same subject. Make it a realistic photograph of ${prompt}.`,
            `Create an alternative version of this image but change the composition slightly. Keep it looking like a real photograph of ${prompt}.`
        ];
        
        // Function to generate a single variation
        async function generateVariation(enhancedPrompt, index) {
            console.log(`Generating variation ${index + 1} with prompt: ${enhancedPrompt.substring(0, 50)}...`);
            
            // Download the original image to use as input
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = 'image/jpeg'; // Assuming JPEG format - adjust as needed
            
            // Generate content with both image and text as input
            const result = await model.generateContent({
                contents: [{ 
                    role: "user", 
                    parts: [
                        { 
                            text: `Based on this reference image, ${enhancedPrompt}. The result should be a realistic photograph, not AI art.`
                        },
                        {
                            inlineData: {
                                mimeType,
                                data: base64Image
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.2, // Lower temperature for more realistic output
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 8192,
                    responseModalities: ["Text", "Image"], // Use responseModalities for image generation
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_ONLY_HIGH"
                    }
                ]
            });
            
            const response = result.response;
            
            if (response.candidates && response.candidates.length > 0) {
                const parts = response.candidates[0].content.parts;
                
                // Look for inline image data
                for (const part of parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                        console.log(`Successfully generated variation ${index + 1}!`);
                        
                        // Create temporary directory if it doesn't exist
                        const tmpDir = path.join(process.cwd(), 'tmp');
                        await fs.mkdir(tmpDir, { recursive: true });
                        
                        // Save image to temporary file
                        const imageFileName = `variation_${Date.now()}_${index}.png`;
                        const imagePath = path.join(tmpDir, imageFileName);
                        await fs.writeFile(imagePath, Buffer.from(part.inlineData.data, 'base64'));
                        
                        // Upload to Cloudinary
                        const uploadResult = await cloudinary.uploader.upload(imagePath);
                        
                        // Delete temporary file
                        await fs.unlink(imagePath);
                        
                        console.log(`Variation ${index + 1} uploaded to Cloudinary: ${uploadResult.secure_url}`);
                        return uploadResult.secure_url;
                    }
                }
                
                // Check for text or function call responses
                for (const part of parts) {
                    if (part.text) {
                        console.log(`Received text response instead of image for variation ${index + 1}:`, part.text.substring(0, 100) + '...');
                    }
                    if (part.functionCall && part.functionCall.name === 'generate_image') {
                        console.log(`API key limitation - received function call instead of direct image generation`);
                        throw new Error('Your Gemini API key does not have access to direct image generation.');
                    }
                }
            }
            
            console.log(`No usable image generated for variation ${index + 1}`);
            throw new Error('Variation generation failed - no image found in response');
        }
        
        // Generate variations in parallel
        const variationPromises = enhancedPrompts.map(generateVariation);
        
        // Wait for all image generations to complete or fail
        const results = await Promise.allSettled(variationPromises);
        
        // Filter out only the successful generations
        const variationUrls = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        console.log(`Successfully generated ${variationUrls.length} variations`);
        
        // Return array with original image as first item, followed by variations
        return [imageUrl, ...variationUrls];
    } catch (error) {
        console.error('Variation generation error:', error.message);
        // Return just the original image if variations fail
        return [imageUrl];
    }
}

// Route for uploading an image and generating variations
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No image uploaded' 
            });
        }
        
        const prompt = req.body.prompt || 'generated image';
        console.log(`Processing image upload with prompt: ${prompt}`);
        
        // Upload the original image to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'uploads' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            
            uploadStream.end(req.file.buffer);
        });
        
        console.log('Original image uploaded to Cloudinary:', uploadResult.secure_url);
        
        // Generate variations based on the uploaded image
        const allImageUrls = await generateVariationsFromUpload(uploadResult.secure_url, prompt);
        
        // Generate phrases using DeepSeek
        const phrases = await generatePhrases(prompt);
        
        // Combine images with phrases
        const variations = allImageUrls.map((imageUrl, index) => ({
            id: index + 1,
            phrase: phrases[index % phrases.length], // Ensure we don't go out of bounds
            overlayImage: imageUrl,
            generatedImage: index > 0, // First image is the original upload
            textProperties: {
                size: "large", // Larger text size
                placement: "center", // Center placement
                fontWeight: "bold", // Bold text
                color: "white", // White text color
                strokeWidth: 2, // Slightly thicker outline for better readability
                strokeColor: "rgba(0,0,0,0.7)", // Dark outline for contrast
                noBackground: true, // No background color
                preserveOriginalImage: true // Ensure original image is kept as is
            }
        }));
        
        return res.status(200).json({
            success: true,
            variations
        });
        
    } catch (error) {
        console.error('Error processing upload:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
});

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

// Test endpoint for image generation with Gemini
router.get('/test-image', async (req, res) => {
    try {
        const prompt = req.query.prompt || 'cute puppy';
        console.log('Testing Gemini image generation with prompt:', prompt);
        
        // Generate a single image with Gemini
        const imageUrls = await generateImages(prompt, 1);
        
        return res.json({ 
            success: true, 
            message: 'Image generated successfully with Gemini',
            imageUrl: imageUrls[0],
            prompt: prompt
        });
    } catch (error) {
        console.error('Gemini image generation error:', error);
        
        // Provide clear explanation if it's an API key limitation issue
        if (error.message.includes('does not have access to direct image generation')) {
            return res.status(403).json({
                success: false,
                error: 'Gemini API Key Limitation',
                message: 'Your Gemini API key does not have access to direct image generation. This feature requires Gemini 2.0 Flash with Experimental features enabled.',
                details: error.message,
                apiInfo: 'Visit https://ai.google.dev/ to upgrade your API key or enable experimental features.'
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: `Gemini API Error: ${error.message}`,
            error: error.message
        });
    }
});

// Add a new route for generating variations
router.post('/variations', async (req, res) => {
    try {
        const { prompt, hasImage, imageData } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        // Generate phrases using DeepSeek
        const phrases = await generatePhrases(prompt);

        // If image is provided - generate variations based on the uploaded image
        if (hasImage && imageData) {
            console.log('User provided image, generating variations with Gemini');
            
            try {
                // First, upload the base64 image to Cloudinary
                const uploadResult = await cloudinary.uploader.upload(imageData, {
                    folder: 'uploads'
                });
                
                console.log('Image uploaded to Cloudinary:', uploadResult.secure_url);
                
                // Generate variations based on the uploaded image
                const allImageUrls = await generateVariationsFromUpload(uploadResult.secure_url, prompt);
                
                console.log(`Generated ${allImageUrls.length} images (including original)`);
                
                // Combine images with phrases
                const variations = allImageUrls.map((imageUrl, index) => ({
                    id: index + 1,
                    phrase: phrases[index % phrases.length], // Ensure we don't go out of bounds
                    overlayImage: imageUrl,
                    generatedImage: index > 0, // First image is the original upload
                    textProperties: {
                        size: "large", // Larger text size
                        placement: "center", // Center placement
                        fontWeight: "bold", // Bold text
                        color: "white", // White text color
                        strokeWidth: 2, // Slightly thicker outline for better readability
                        strokeColor: "rgba(0,0,0,0.7)", // Dark outline for contrast
                        noBackground: true, // No background color
                        preserveOriginalImage: true // Ensure original image is kept as is
                    }
                }));
                
                return res.status(200).json({
                    success: true,
                    variations
                });
            } catch (error) {
                console.error('Error generating variations from uploaded image:', error);
                
                // If variation generation fails, fall back to just using the uploaded image
                console.log('Falling back to using original image only');
                
                // Create variations with just the user-provided image
                const variations = phrases.map((phrase, index) => ({
                    id: index + 1,
                    phrase: phrase,
                    overlayImage: imageData,
                    generatedImage: false,
                    textProperties: {
                        size: "large", // Larger text size
                        placement: "center", // Center placement
                        fontWeight: "bold", // Bold text
                        color: "white", // White text color
                        strokeWidth: 2, // Slightly thicker outline for better readability
                        strokeColor: "rgba(0,0,0,0.7)", // Dark outline for contrast
                        noBackground: true, // No background color
                        preserveOriginalImage: true // Ensure original image is kept as is
                    }
                }));
                
                return res.status(200).json({
                    success: true,
                    variations,
                    note: 'Using original image only as variation generation failed'
                });
            }
        } 
        // If image is not provided - use Gemini API to generate images
        else {
            console.log('No image provided, generating images with Gemini API');
            
            try {
                // Generate images using Gemini
                const imageUrls = await generateImages(prompt);
                
                // Combine images with phrases
                const variations = imageUrls.map((imageUrl, index) => ({
                    id: index + 1,
                    phrase: phrases[index % phrases.length], // Ensure we don't go out of bounds
                    overlayImage: imageUrl,
                    generatedImage: true,
                    textProperties: {
                        size: "large", // Larger text size
                        placement: "center", // Center placement
                        fontWeight: "bold", // Bold text
                        color: "white", // White text color
                        strokeWidth: 2, // Slightly thicker outline for better readability
                        strokeColor: "rgba(0,0,0,0.7)", // Dark outline for contrast
                        noBackground: true, // No background color
                        preserveOriginalImage: true // Ensure original image is kept as is
                    }
                }));
                
                return res.status(200).json({
                    success: true,
                    variations
                });
            } catch (error) {
                console.error('Gemini image generation failed:', error.message);
                
                // Provide detailed error information about API key requirements
                if (error.message.includes('does not have access to direct image generation')) {
                    return res.status(403).json({
                        success: false,
                        error: 'Gemini API Key Limitation',
                        message: 'Your Gemini API key does not have access to direct image generation. This feature requires Gemini 2.0 Flash with Experimental features enabled.',
                        details: error.message,
                        apiInfo: 'Visit https://ai.google.dev/ to upgrade your API key or enable experimental features.'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    error: 'Gemini image generation failed',
                    message: 'Unable to generate images. Please try updating your prompt oruploading your own image instead.',
                    details: error.message
                });
            }
        }
    } catch (error) {
        console.error('Error generating variations:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Server error'
        });
    }
});

router.get('/', protect, getUserVideos);
router.get('/:id', protect, getVideoById);

module.exports = router; 