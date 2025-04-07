const mongoose = require('mongoose');
const { initSubscriptionScheduler } = require('./services/subscriptionScheduler');
require('dotenv').config();

// Set up mongoose connection for standalone scheduler
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Scheduler connected to MongoDB');
  
  // Initialize the subscription scheduler
  initSubscriptionScheduler();
  
  console.log('Subscription scheduler started successfully');
})
.catch(err => {
  console.error('Scheduler MongoDB connection error:', err);
  process.exit(1);
});

// Keep the process running
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Scheduler process terminated');
    process.exit(0);
  });
});

console.log('Subscription scheduler service started'); 