const mongoose = require('mongoose');

// Global connection cache for serverless functions
let cachedConnection = null;

const connectDB = async () => {
  try {
    // If already connected, return the existing connection
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log('Using existing MongoDB connection');
      return cachedConnection;
    }
    
    // Connection options
    const options = {
      dbName: 'aivideo', // This ensures you only use the aivideo database
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      bufferCommands: false, // Disable buffering for serverless
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    // Store the connection in cache
    cachedConnection = conn;
    
    console.log(`MongoDB Connected: ${conn.connection.host} to database: aivideo`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    
    // In serverless environment, don't exit the process
    if (process.env.NODE_ENV === 'production') {
      throw error; // Propagate error upward but don't terminate
    } else {
      // Only exit in development for faster feedback
      process.exit(1);
    }
  }
};

module.exports = connectDB; 