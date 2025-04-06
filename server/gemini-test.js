const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function testGemini() {
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log("GEMINI_API_KEY is not set in .env file");
        process.exit(1);
    }
    
    console.log(`API Key configured: ${apiKey ? 'Yes' : 'No'}`);
    
    // Initialize the Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the Gemini model with image generation capability
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash-exp"
    });
    
    // Test prompt from command line argument or default
    const prompt = process.argv[2] || 'a cute cat sitting on a sofa';
    console.log(`Using prompt: "${prompt}"`);
    
    try {
        // Generate content with the option to output images
        console.log('Requesting image generation from Gemini...');
        
        // Request the model to generate content that includes images
        const result = await model.generateContent({
            contents: [{ 
                role: "user", 
                parts: [{ 
                    text: `Create a photorealistic image of: ${prompt}. 
                    I need ONLY an image with no explanation text.
                    The image should be high quality, detailed, with good lighting.
                    No text, no watermarks, just the image itself.` 
                }] 
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 32,
                topP: 1,
                maxOutputTokens: 8192,
            },
            // These safety settings are necessary for image generation
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
            ],
            // Tools for image generation
            tools: [{
                functionDeclarations: [{
                    name: "generate_image",
                    description: "Generate an image based on the given prompt",
                    parameters: {
                        type: "object",
                        properties: {
                            prompt: {
                                type: "string",
                                description: "The prompt to generate an image from"
                            }
                        },
                        required: ["prompt"]
                    }
                }]
            }]
        });
        
        // Process the response
        const response = result.response;
        console.log('Response received from Gemini!');
        
        // Check if we got any parts in the response
        if (response.candidates && response.candidates.length > 0) {
            const parts = response.candidates[0].content.parts;
            console.log(`Received ${parts.length} parts in the response`);
            
            // Look for image parts in the response
            let imageFound = false;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                    console.log('✅ Found an image in the response!');
                    console.log('Image MIME type:', part.inlineData.mimeType);
                    console.log('Image data length:', part.inlineData.data.length);
                    
                    // Create directories if needed
                    const tmpDir = path.join(process.cwd(), 'tmp');
                    if (!fs.existsSync(tmpDir)) {
                        fs.mkdirSync(tmpDir, { recursive: true });
                    }
                    
                    // Save the image to disk
                    const outputPath = path.join(tmpDir, `gemini_output_${Date.now()}.png`);
                    fs.writeFileSync(outputPath, Buffer.from(part.inlineData.data, 'base64'));
                    console.log(`✅ Image saved to ${outputPath}`);
                    
                    imageFound = true;
                } else if (part.text) {
                    console.log('Received text in response:', part.text);
                } else if (part.functionCall) {
                    console.log('⚠️ Received function call instead of direct image:');
                    console.log(JSON.stringify(part.functionCall, null, 2));
                    
                    // If the model calls a function to generate an image
                    if (part.functionCall.name === 'generate_image') {
                        console.log('Function requested to generate image with prompt:', 
                            part.functionCall.args.prompt);
                    }
                }
            }
            
            if (!imageFound) {
                console.log('❌ No image was generated in the response.');
            }
        } else {
            console.log('❌ No candidates in the response');
            console.log('Full response:', JSON.stringify(response, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Error generating image:', error.message);
        if (error.response) {
            console.error('API Error details:', error.response);
        }
    }
}

testGemini(); 