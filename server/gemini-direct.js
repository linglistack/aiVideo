const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

async function generateImage() {
  // Use environment variable for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("GEMINI_API_KEY is not set in .env file");
    process.exit(1);
  }

  // Get prompt from command line or use default
  const prompt = process.argv[2] || "Generate an image of a futuristic cityscape at night.";
  console.log(`Using prompt: "${prompt}"`);

  const genAI = new GoogleGenerativeAI(apiKey);

  // Initialize with responseModalities parameter for image generation
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
  });

  try {
    console.log("Requesting image generation from Gemini...");
    
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `Create a photorealistic image of: ${prompt}. I need ONLY an image with no explanation text.` }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
        responseModalities: ["Text", "Image"], // This parameter is key for image generation
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
    console.log("Response received from Gemini!");

    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      console.log(`Received ${parts.length} parts in the response`);
      
      let imageFound = false;
      for (const part of parts) {
        if (part.text) {
          console.log("Text response:", part.text);
        } else if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith("image/")) {
          console.log("✅ Found an image in the response!");
          console.log("Image MIME type:", part.inlineData.mimeType);
          console.log("Image data length:", part.inlineData.data.length);
          
          // Create directories if needed
          const tmpDir = path.join(process.cwd(), "tmp");
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          
          // Save the image to disk
          const outputPath = path.join(tmpDir, `gemini_output_${Date.now()}.png`);
          fs.writeFileSync(outputPath, Buffer.from(part.inlineData.data, "base64"));
          console.log(`✅ Image saved to ${outputPath}`);
          
          imageFound = true;
        } else if (part.functionCall) {
          console.log("⚠️ Received function call instead of direct image - this means your API key doesn't have image generation access");
          console.log(JSON.stringify(part.functionCall, null, 2));
        }
      }
      
      if (!imageFound) {
        console.log("❌ No image was generated in the response");
      }
    } else {
      console.log("❌ No candidates in the response");
      console.log("Full response:", JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error("❌ Error generating image:", error.message);
    if (error.response) {
      console.error("API Error details:", error.response);
    }
  }
}

generateImage(); 