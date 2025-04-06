const dashscope = require('dashscope');
require('dotenv').config();

// Set the API key
dashscope.api_key = process.env.QWEN_API_KEY;
console.log('API key configured:', dashscope.api_key ? 'Yes (starting with ' + dashscope.api_key.substring(0, 4) + '...)' : 'No');

// Test with the TextToImage API
async function testTextToImage() {
    const prompt = process.argv[2] || 'a cute cat sitting on a sofa';
    console.log(`Using prompt: "${prompt}"`);
    
    try {
        const response = await dashscope.imageGeneration.wanx({
            model: 'wanx-v1',
            prompt: prompt,
            n: 1,
            size: '1024*1024',
            negative_prompt: 'text, watermark, low quality, blurry, distorted, deformed'
        });
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
        if (response.data && response.data.output && response.data.output.url) {
            console.log('Success! Image URL:', response.data.output.url);
        } else {
            console.log('No image URL found in response');
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testTextToImage(); 