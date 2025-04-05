const mongoose = require('mongoose');
const User = require('../models/aiUser');
const Plan = require('../models/Plan');
const cron = require('node-cron');

// Define cron jobs at module level
let resetSubscriptionsJob = null;
let resetCreditCyclesJob = null;

/**
 * Job to check and reset subscriptions that have reached their end date
 * Resets video credits and updates the end date for the next period
 */
const resetSubscriptionsJobFn = async () => {
  try {
    console.log('Running subscription reset job...');
    const now = new Date();
    
    // Find all users with active subscriptions that have passed their end date
    const usersToReset = await User.find({
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
        await User.findByIdAndUpdate(user._id, {
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
  // Schedule daily job to reset subscriptions at midnight
  resetSubscriptionsJob = cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      console.log(`Running subscription reset job at ${now.toISOString()}`);
      
      // Run the subscription reset function
      await resetSubscriptionsJobFn();
    } catch (error) {
      console.error('Error in subscription reset job:', error);
    }
  });
  
  // Schedule daily job to check and reset credit cycles
  resetCreditCyclesJob = cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running daily credit cycle reset job');
      const result = await resetCreditCycles();
      console.log('Credit cycle reset result:', result);
    } catch (error) {
      console.error('Error in credit cycle reset job:', error);
    }
  });
  
  // Start the cron jobs
  resetSubscriptionsJob.start();
  resetCreditCyclesJob.start();
  
  console.log('Subscription scheduler initialized');
};

/**
 * Reset credits for all users whose cycle has ended
 */
const resetCreditCycles = async () => {
  try {
    console.log('Running credit cycle reset check');
    
    // Find all users with active subscriptions whose cycle has ended
    const users = await User.find({
      'subscription.isActive': true,
      'subscription.cycleEndDate': { $lte: new Date() }
    });
    
    console.log(`Found ${users.length} users who need credit cycle reset`);
    
    for (const user of users) {
      await resetUserCreditCycle(user._id);
    }
    
    return { success: true, resetCount: users.length };
  } catch (error) {
    console.error('Error in resetCreditCycles:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset a specific user's credit cycle
 */
const resetUserCreditCycle = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.subscription.isActive) {
      return { success: false, error: 'User not found or subscription not active' };
    }
    
    // Get plan details to determine credit allocation
    const planName = user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1);
    const plan = await Plan.findOne({ name: planName });
    
    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }
    
    // Calculate new cycle dates
    const now = new Date();
    const cycleStartDate = now;
    const cycleEndDate = new Date(now);
    cycleEndDate.setDate(cycleEndDate.getDate() + 30); // 30-day cycle
    
    // Update user subscription
    user.subscription.cycleStartDate = cycleStartDate;
    user.subscription.cycleEndDate = cycleEndDate;
    user.subscription.creditsUsed = 0;
    user.subscription.creditsTotal = plan.videosCredits;
    
    await user.save();
    
    console.log(`Reset credit cycle for user ${userId}, new credits: ${plan.videosCredits}`);
    
    return { 
      success: true, 
      user: userId, 
      cycle: {
        start: cycleStartDate,
        end: cycleEndDate
      },
      credits: plan.videosCredits
    };
  } catch (error) {
    console.error(`Error resetting credit cycle for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Calculate prorated price and credits for plan upgrade
 */
const calculateProration = async (userId, newPlanName) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.subscription.isActive) {
      return { success: false, error: 'User not found or subscription not active' };
    }
    
    const currentPlanName = user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1);
    const newPlanNameFormatted = newPlanName.charAt(0).toUpperCase() + newPlanName.slice(1);
    
    // Get current and new plan details
    const [currentPlan, newPlan] = await Promise.all([
      Plan.findOne({ name: currentPlanName }),
      Plan.findOne({ name: newPlanNameFormatted })
    ]);
    
    if (!currentPlan || !newPlan) {
      return { success: false, error: 'Plan not found' };
    }
    
    // Calculate remaining days in current cycle
    const now = new Date();
    const cycleEndDate = new Date(user.subscription.cycleEndDate);
    const totalDaysInCycle = 30;
    const daysElapsed = Math.floor((now - user.subscription.cycleStartDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = totalDaysInCycle - daysElapsed;
    const cycleRemainingPercentage = daysRemaining / totalDaysInCycle;
    
    // Calculate price differences based on billing cycle
    const isYearly = user.subscription.billingCycle === 'yearly';
    const currentPrice = isYearly ? currentPlan.yearlyPrice : currentPlan.monthlyPrice;
    const newPrice = isYearly ? newPlan.yearlyPrice : newPlan.monthlyPrice;
    const priceDifference = newPrice - currentPrice;
    
    // Calculate prorated price
    const proratedPrice = priceDifference * cycleRemainingPercentage;
    
    // Calculate additional credits
    const creditDifference = newPlan.videosCredits - currentPlan.videosCredits;
    const additionalCredits = Math.floor(creditDifference * cycleRemainingPercentage);
    
    return {
      success: true,
      proratedPrice: Math.max(0, proratedPrice.toFixed(2)),
      additionalCredits,
      cycleRemainingPercentage: (cycleRemainingPercentage * 100).toFixed(2) + '%',
      daysRemaining,
      currentPlan: currentPlan.name,
      newPlan: newPlan.name,
      currentCredits: user.subscription.creditsTotal - user.subscription.creditsUsed,
      newTotalCredits: user.subscription.creditsTotal - user.subscription.creditsUsed + additionalCredits
    };
  } catch (error) {
    console.error(`Error calculating proration for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  initSubscriptionScheduler,
  resetSubscriptionsJobFn,
  resetCreditCycles,
  resetUserCreditCycle,
  calculateProration,
  resetCreditCyclesJob,
  resetSubscriptionsJob
}; 