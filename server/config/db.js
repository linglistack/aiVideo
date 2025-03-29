const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Connect to MongoDB with explicit database name
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'aivideo', // This ensures you only use the aivideo database
    });

    console.log(`MongoDB Connected: ${conn.connection.host} to database: aivideo`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 