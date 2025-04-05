// Minimal serverless entry point for Vercel
const app = require('./server');

// Handler for Vercel serverless function
module.exports = (req, res) => {
  try {
    // Simple built-in health check
    if (req.url === '/health-minimal') {
      return res.status(200).json({
        message: 'Minimal health check passed',
        timestamp: new Date().toISOString(),
        nodejs: process.version,
        env: process.env.NODE_ENV
      });
    }
    
    // Forward request to Express app
    return app(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    res.status(500).json({
      error: 'Serverless handler error',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
}; 