const axios = require('axios');
require('dotenv').config();

async function testDashScope() {
    // Get API key from environment
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
        console.log("QWEN_API_KEY is not set in .env file");
        return;
    }
    
    console.log(`API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Test prompt
    const prompt = process.argv[2] || 'a cute cat sitting on a sofa';
    console.log(`Using prompt: "${prompt}"`);
    
    // Create request body
    const requestBody = {
        model: "wanx2.1-t2i-turbo",
        input: {
            prompt: prompt,
            negative_prompt: "text, watermark, low quality, blurry, distorted, deformed"
        },
        parameters: {
            size: "1024*1024",
            n: 1,
            seed: Math.floor(Math.random() * 1000000),
            watermark: false
        }
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    console.log('Endpoint: https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis');
    
    try {
        // Step 1: Create task
        console.log('Creating task...');
        const createTaskResponse = await axios.post(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
            requestBody,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-DashScope-Async': 'enable'
                }
            }
        );
        
        console.log('Task creation response:', JSON.stringify(createTaskResponse.data, null, 2));
        
        if (!createTaskResponse.data?.output?.task_id) {
            console.log('No task ID returned');
            return;
        }
        
        const taskId = createTaskResponse.data.output.task_id;
        console.log('Task ID:', taskId);
        
        // Step 2: Poll for results
        let taskResult;
        let retryCount = 0;
        const maxRetries = 15;
        
        while (retryCount < maxRetries) {
            console.log(`Polling for results, attempt ${retryCount + 1}/${maxRetries}`);
            
            const resultResponse = await axios.get(
                `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`
                    }
                }
            );
            
            taskResult = resultResponse.data;
            console.log('Task status:', taskResult.output?.task_status);
            
            if (taskResult.output?.task_status === 'SUCCEEDED') {
                console.log('Task succeeded!');
                break;
            }
            
            if (taskResult.output?.task_status === 'FAILED') {
                console.log('Task failed:', JSON.stringify(taskResult, null, 2));
                return;
            }
            
            console.log('Task still processing, waiting 2s...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            retryCount++;
        }
        
        if (retryCount >= maxRetries) {
            console.log('Task polling timeout');
            return;
        }
        
        // Step 3: Get results
        const imageUrl = taskResult?.output?.results?.[0]?.url;
        
        if (!imageUrl) {
            console.log('No image URL found in task results:', JSON.stringify(taskResult, null, 2));
            return;
        }
        
        console.log('Success! Image URL:', imageUrl);
        console.log('Actual prompt:', taskResult.output?.results?.[0]?.actual_prompt);
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testDashScope(); 