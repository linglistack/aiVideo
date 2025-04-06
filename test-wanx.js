const axios = require('axios');
require('dotenv').config({ path: './.env' });

// Get credentials from environment variables
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_CLIENT_ID = process.env.QWEN_CLIENT_ID;
const QWEN_CLIENT_SECRET = process.env.QWEN_CLIENT_SECRET;
const QWEN_API_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image-generation/image-synthesis";

console.log('Credentials:');
console.log('- QWEN_API_KEY:', QWEN_API_KEY ? 'Set (starting with ' + QWEN_API_KEY.substring(0, 5) + '...)' : 'Not set');
console.log('- QWEN_CLIENT_ID:', QWEN_CLIENT_ID ? 'Set (starting with ' + QWEN_CLIENT_ID.substring(0, 5) + '...)' : 'Not set');
console.log('- QWEN_CLIENT_SECRET:', QWEN_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('- QWEN_API_ENDPOINT:', QWEN_API_ENDPOINT);

async function testDashScopeApi() {
    const prompt = process.argv[2] || 'a cute cat sitting on a sofa';
    console.log('\nTesting DashScope API with prompt:', prompt);
    
    try {
        console.log(`\n--------------------------------------`);
        console.log(`Using API key authentication`);
        
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${QWEN_API_KEY}`
        };
        
        console.log('Headers:', JSON.stringify(headers));
        
        const payload = {
            model: "wanx-v1",
            input: {
                prompt: prompt,
                negative_prompt: "text, watermark, low quality, blurry",
                n: 1,
                size: "1024*1024",
                steps: 30
            }
        };
        
        console.log('Request:');
        console.log('- URL:', QWEN_API_ENDPOINT);
        console.log('- Payload:', JSON.stringify(payload));
        
        const response = await axios.post(QWEN_API_ENDPOINT, payload, { headers });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, response.headers);
        console.log(`Response data:`, JSON.stringify(response.data).substring(0, 500) + (JSON.stringify(response.data).length > 500 ? '...' : ''));
        
        if (response.data?.output?.url) {
            console.log(`SUCCESS: Got image URL:`, response.data.output.url);
            return;
        } else {
            console.log('No image URL found in response');
        }
    } catch (error) {
        console.error(`Error:`, error.message);
        if (error.response) {
            console.error(`- Response status:`, error.response.status);
            console.error(`- Response data:`, error.response.data);
        }
    }
    
    console.log('\nAPI call failed. Unable to generate an image.');
}

// Run the test
testDashScopeApi()
    .then(() => console.log('\nTesting complete'))
    .catch(err => console.error('Unexpected error:', err)); 