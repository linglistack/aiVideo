const aiUser = require('../models/aiUser');
const cron = require('node-cron');
const mongoose = require('mongoose');

/**
 * Job to check and reset subscriptions that have reached their end date
 * Resets video credits and updates the end date for the next period
 */
const resetSubscriptionsJob = async () => {
  try {
    console.log('Running subscription reset job...');
    const now = new Date();
    
    // Find all users with active subscriptions that have passed their end date
    const usersToReset = await aiUser.find({
      'subscription.isActive': true,
      'subscription.endDate': { $lte: now }
    });
    
    console.log(`Found ${usersToReset.length} subscriptions to reset`);
    
    // Process each user subscription
    for (const user of usersToReset) {
      try {
        // Calculate new end date based on billing cycle
        const newEndDate = new Date(user.subscription.endDate);
        
        if (user.subscription.billingCycle === 'yearly') {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
          // Default to monthly
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        }
        
        console.log(`Resetting subscription for user ${user._id}, plan: ${user.subscription.plan}`);
        console.log(`New end date: ${newEndDate.toISOString()}`);
        
        // Reset video usage and update end date
        await aiUser.findByIdAndUpdate(user._id, {
          'subscription.videosUsed': 0,
          'subscription.endDate': newEndDate,
          'subscription.lastResetDate': now
        });
        
        console.log(`Successfully reset subscription for user ${user._id}`);
      } catch (userError) {
        console.error(`Error resetting subscription for user ${user._id}:`, userError);
        // Continue with other users even if one fails
      }
    }
    
    console.log('Subscription reset job completed');
  } catch (error) {
    console.error('Error in subscription reset job:', error);
  }
};

/**
 * Initialize the subscription scheduler
 */
const initSubscriptionScheduler = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', resetSubscriptionsJob);
  
  // Also run immediately when server starts to catch any missed resets
  resetSubscriptionsJob();
  
  console.log('Subscription scheduler initialized');
};

module.exports = {
  initSubscriptionScheduler,
  resetSubscriptionsJob // Exported for testing purposes
}; 