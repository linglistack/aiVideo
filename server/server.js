const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Configure environment variables
dotenv.config();

// Create Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_URL || 'https://aivideo.vercel.app'] 
    : 'http://localhost:3000',
  credentials: true
}));

// Request body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Only serve static files in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'API is running', timestamp: new Date().toISOString() });
});

// Health check route that doesn't depend on database
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL === '1',
    vercelEnv: process.env.VERCEL_ENV,
    env: {
      mongoUri: Boolean(process.env.MONGODB_URI),
      jwtSecret: Boolean(process.env.JWT_SECRET),
      cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME)
    }
  };
  
  // Add database status if possible
  try {
    health.database = {
      readyState: mongoose.connection.readyState,
      connected: mongoose.connection.readyState === 1
    };
  } catch (e) {
    health.database = { error: 'Not connected' };
  }
  
  res.json(health);
});

// Routes - lazy load them only when needed
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/videos', require('./routes/videoRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));

// Special route for Stripe webhooks (needs raw body)
app.post('/api/subscriptions/webhook', 
  express.raw({ type: 'application/json' }),
  require('./controllers/subscriptionController').handleWebhook
);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Only initialize scheduler and listen on port in development
if (process.env.NODE_ENV !== 'production') {
  try {
    const { initSubscriptionScheduler } = require('./services/subscriptionScheduler');
    initSubscriptionScheduler();
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Development server setup error:', error);
  }
}

// Connect to database on first request (lazy loading for serverless)
app.use(async (req, res, next) => {
  // Skip DB connection for health checks
  if (req.path === '/health' || req.path === '/health-minimal') {
    return next();
  }
  
  try {
    // Only connect if not already connected
    if (mongoose.connection.readyState !== 1) {
      const connectDB = require('./config/db');
      await connectDB();
    }
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
});

// Export for serverless
module.exports = app; 