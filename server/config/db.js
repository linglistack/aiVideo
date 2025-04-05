const mongoose = require('mongoose');

// Global connection cache for serverless functions
let cachedConnection = null;

// Track connection promise to prevent multiple connection attempts
let connectionPromise = null;

const connectDB = async () => {
  try {
    // If already connected, return the existing connection
    if (mongoose.connection.readyState === 1) {
      console.log('Using existing MongoDB connection');
      return mongoose;
    }
    
    // If connection is in progress, wait for it to complete
    if (connectionPromise) {
      console.log('Connection in progress, waiting for it to complete');
      return await connectionPromise;
    }
    
    console.log('Creating new MongoDB connection');
    
    // Connection options
    const options = {
      dbName: 'aivideo', // This ensures you only use the aivideo database
      serverSelectionTimeoutMS: 10000, // Timeout after 10s (increased from 5s)
      // For Vercel serverless, we need to allow buffering to prevent errors
      // but will still explicitly await connections in our middleware
      bufferCommands: true
    };

    // Create a promise for the connection and store it
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, options);
    
    // Wait for connection
    const conn = await connectionPromise;
    
    // Once connected, store the connection
    cachedConnection = conn;
    
    console.log(`MongoDB Connected: ${conn.connection.host} to database: aivideo`);
    
    // Clear the connection promise after successful connection
    connectionPromise = null;
    
    return conn;
  } catch (error) {
    // Clear the connection promise on error
    connectionPromise = null;
    
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