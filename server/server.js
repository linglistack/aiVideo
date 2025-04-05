const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const { initSubscriptionScheduler } = require('./services/subscriptionScheduler');
const mongoose = require('mongoose');

dotenv.config();

// Connect to database - wrapped in try/catch to prevent unhandled rejections
try {
  // Connect asynchronously but don't wait for it here
  connectDB().catch(error => {
    console.error('Database connection failed:', error.message);
    // Don't exit process in serverless environment
  });
} catch (error) {
  console.error('Database connection error:', error.message);
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_URL || 'https://aivideo.vercel.app'] 
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the uploads directory - conditional for serverless
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Routes
const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const videoRoutes = require('./routes/videoRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const contactRoutes = require('./routes/contactRoutes');

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