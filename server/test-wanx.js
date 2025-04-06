const axios = require('axios');
require('dotenv').config({ path: './.env' });

// Get credentials from environment variables
const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_CLIENT_ID = process.env.QWEN_CLIENT_ID;
const QWEN_CLIENT_SECRET = process.env.QWEN_CLIENT_SECRET;
const QWEN_API_ENDPOINT = process.env.QWEN_API_ENDPOINT || 'https://api.aliyun.com/wanx/image-generation';

console.log('Credentials:');
console.log('- QWEN_API_KEY:', QWEN_API_KEY ? 'Set (starting with ' + QWEN_API_KEY.substring(0, 5) + '...)' : 'Not set');
console.log('- QWEN_CLIENT_ID:', QWEN_CLIENT_ID ? 'Set (starting with ' + QWEN_CLIENT_ID.substring(0, 5) + '...)' : 'Not set');
console.log('- QWEN_CLIENT_SECRET:', QWEN_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('- QWEN_API_ENDPOINT:', QWEN_API_ENDPOINT);

async function testWanxApi() {
    const prompt = process.argv[2] || 'a cute cat sitting on a sofa';
    console.log('\nTesting Wanx API with prompt:', prompt);
    
    // Try all authentication methods
    const authMethods = [
        {
            name: 'QWEN_API_KEY direct',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${QWEN_API_KEY}`
            }
        },
        {
            name: 'X-Aliyun headers',
            headers: {
                "Content-Type": "application/json",
                "X-Aliyun-AccessKeyId": QWEN_CLIENT_ID,
                "X-Aliyun-AccessKeySecret": QWEN_CLIENT_SECRET
            }
        },
        {
            name: 'Bearer with ID:Secret',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${QWEN_CLIENT_ID}:${QWEN_CLIENT_SECRET}`
            }
        },
        {
            name: 'Bearer with ID only',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${QWEN_CLIENT_ID}`
            }
        },
        {
            name: 'Basic Auth',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(`${QWEN_CLIENT_ID}:${QWEN_CLIENT_SECRET}`).toString('base64')}`
            }
        },
        {
            name: 'API Key as Username',
            headers: {
                "Content-Type": "application/json"
            },
            auth: {
                username: QWEN_API_KEY,
                password: ''
            }
        }
    ];
    
    for (const method of authMethods) {
        try {
            console.log(`\n--------------------------------------`);
            console.log(`Testing auth method: ${method.name}`);
            console.log('Headers:', JSON.stringify(method.headers));
            
            const payload = {
                prompt: prompt,
                size: "1024x1024",
                num_images: 1
            };
            
            console.log('Request:');
            console.log('- URL:', QWEN_API_ENDPOINT);
            console.log('- Payload:', JSON.stringify(payload));
            
            const options = { headers: method.headers };
            if (method.auth) {
                options.auth = method.auth;
            }
            
            const response = await axios.post(QWEN_API_ENDPOINT, payload, options);
            
            console.log(`Response status: ${response.status}`);
            console.log(`Response headers:`, response.headers);
            console.log(`Response data:`, JSON.stringify(response.data).substring(0, 500) + (JSON.stringify(response.data).length > 500 ? '...' : ''));
            
            if (response.data?.data?.url) {
                console.log(`SUCCESS: Got image URL:`, response.data.data.url);
                console.log(`Use authentication method: ${method.name}`);
                return;
            } else {
                console.log('No image URL found in response');
            }
        } catch (error) {
            console.error(`Error with method ${method.name}:`, error.message);
            if (error.response) {
                console.error(`- Response status:`, error.response.status);
                console.error(`- Response data:`, error.response.data);
            }
        }
    }
    
    console.log('\nAll methods failed. None were able to generate an image.');
}

// Run the test
testWanxApi()
    .then(() => console.log('\nTesting complete'))
    .catch(err => console.error('Unexpected error:', err)); 