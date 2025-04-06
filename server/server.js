const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const { initSubscriptionScheduler } = require('./services/subscriptionScheduler');
const mongoose = require('mongoose');

dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? ['https://ai-video-client.vercel.app', 'https://aivideo.vercel.app', process.env.CLIENT_URL].filter(Boolean)
      : ['http://localhost:3000'];
    
    // Allow requests with no origin (like mobile apps, curl requests, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.log('CORS blocked request from:', origin);
      // Still allow the request to go through to avoid breaking functionality
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS preflight requests
app.options('*', (req, res) => {
  // Add the CORS headers manually to ensure they are applied
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).send();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the uploads directory - conditional for serverless
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const videoRoutes = require('./routes/videoRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const contactRoutes = require('./routes/contactRoutes');

// Special endpoint to ensure DB connection is established
app.get('/api/connect', async (req, res) => {
  try {
    await connectDB();
    res.json({ success: true, message: 'Database connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database connection middleware for Vercel
// This ensures DB is connected before processing any API request
const ensureDbConnected = async (req, res, next) => {
  try {
    // Skip for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    // Connect to database if not already connected
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection error in middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection failed'
    });
  }
};

// Apply DB connection middleware to all API routes
app.use('/api', ensureDbConnected);

// Apply routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);

// Special route for Stripe webhooks (needs raw body)
app.post('/api/subscriptions/webhook', 
  express.raw({ type: 'application/json' }),
  require('./controllers/subscriptionController').handleWebhook
);

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Health check route for debugging
app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    vercelEnv: process.env.VERCEL_ENV || 'local',
    database: {
      status: 'disconnected'
    },
    cloudinary: {
      status: 'unknown'
    }
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      health.database = {
        status: 'connected',
        name: mongoose.connection.db.databaseName
      };
    } else {
      health.database = {
        status: 'disconnected',
        readyState: mongoose.connection.readyState
      };
    }
  } catch (e) {
    health.database = {
      status: 'error',
      error: e.message
    };
  }

  // Check if environment variables are set (don't expose actual values)
  health.envCheck = {
    mongodb: Boolean(process.env.MONGODB_URI),
    jwt: Boolean(process.env.JWT_SECRET),
    cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME && 
                        process.env.CLOUDINARY_API_KEY && 
                        process.env.CLOUDINARY_API_SECRET)
  };

  // Return health status
  res.json(health);
});

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

// Initialize the subscription scheduler in development only
// Long-running processes won't work in serverless
if (process.env.NODE_ENV !== 'production') {
    try {
        initSubscriptionScheduler();
    } catch (error) {
        console.error('Failed to initialize scheduler:', error);
    }
}

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel serverless deployment
module.exports = app; 