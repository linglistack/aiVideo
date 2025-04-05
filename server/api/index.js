// Simple API handler for Vercel
export default function handler(req, res) {
  res.status(200).json({
    message: 'API is running',
    timestamp: new Date().toISOString(),
    route: 'api/index.js'
  });
} 