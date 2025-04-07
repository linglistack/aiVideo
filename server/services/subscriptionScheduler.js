const mongoose = require('mongoose');
const User = require('../models/aiUser');
const Plan = require('../models/Plan');
const Payment = require('../models/Payment');
const SubscriptionLog = require('../models/SubscriptionLog');
const cron = require('node-cron');
const stripeService = require('./stripeService');
const paypalService = require('./paypalService');
const emailService = require('./emailService');

// Define cron jobs at module level
let resetSubscriptionsJob = null;
let resetCreditCyclesJob = null;
let checkExpiredSubscriptionsJob = null;
let retryFailedPaymentsJob = null;
let sendUpcomingRenewalNoticesJob = null;

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
          'subscription.creditsUsed': 0,
          'subscription.endDate': newEndDate,
          'subscription.lastResetDate': now
        });
        
        // Log this subscription cycle reset
        await logSubscriptionEvent({
          userId: user._id,
          eventType: 'cycle_reset',
          description: `Subscription cycle reset for ${user.subscription.plan} plan`,
          planName: user.subscription.plan,
          billingCycle: user.subscription.billingCycle,
          paymentProvider: user.subscription.paypalSubscriptionId ? 'paypal' : 'stripe',
          subscriptionId: user.subscription.paypalSubscriptionId || user.subscription.stripeSubscriptionId,
          successful: true
        });
        
        console.log(`Successfully reset subscription for user ${user._id}`);
      } catch (userError) {
        console.error(`Error resetting subscription for user ${user._id}:`, userError);
        
        // Log the failure
        await logSubscriptionEvent({
          userId: user._id,
          eventType: 'cycle_reset_failed',
          description: `Failed to reset subscription cycle: ${userError.message}`,
          planName: user.subscription.plan,
          billingCycle: user.subscription.billingCycle,
          paymentProvider: user.subscription.paypalSubscriptionId ? 'paypal' : 'stripe',
          subscriptionId: user.subscription.paypalSubscriptionId || user.subscription.stripeSubscriptionId,
          successful: false,
          errorMessage: userError.message
        });
        
        // Continue with other users even if one fails
      }
    }
    
    console.log('Subscription reset job completed');
  } catch (error) {
    console.error('Error in subscription reset job:', error);
  }
};

/**
 * Retry failed payments job
 * Attempts to retry failed subscription payments with different strategies based on payment provider
 */
const retryFailedPaymentsJobFn = async () => {
  try {
    console.log('Running payment retry job...');
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    
    // Find failed payments from the last 3 days
    const failedPayments = await Payment.find({
      status: 'failed',
      retryCount: { $lt: 3 }, // Only retry up to 3 times
      createdAt: { $gte: threeDaysAgo },
      paymentType: 'subscription'
    });
    
    console.log(`Found ${failedPayments.length} failed subscription payments to retry`);
    
    for (const payment of failedPayments) {
      try {
        const user = await User.findById(payment.userId);
        if (!user) {
          console.log(`User not found for payment ${payment._id}, skipping retry`);
          continue;
        }
        
        let retryResult = { success: false };
        
        // Handle based on payment provider
        if (payment.provider === 'stripe') {
          // For Stripe, we can use the payment intent to retry
          if (payment.stripePaymentIntentId) {
            retryResult = await stripeService.retryPayment(payment.stripePaymentIntentId);
          }
        } else if (payment.provider === 'paypal') {
          // For PayPal, we need to get the subscription and retry based on their API
          if (user.subscription.paypalSubscriptionId) {
            retryResult = await paypalService.retrySubscriptionPayment(user.subscription.paypalSubscriptionId);
          }
        }
        
        // Update payment record
        payment.retryCount += 1;
        payment.lastRetryDate = now;
        
        if (retryResult.success) {
          payment.status = 'complete';
          payment.retrySuccessDate = now;
          
          // Log success
          await logSubscriptionEvent({
            userId: user._id,
            eventType: 'payment_retry_success',
            description: `Successfully retried failed payment after ${payment.retryCount} attempts`,
            planName: user.subscription.plan,
            billingCycle: user.subscription.billingCycle,
            paymentProvider: payment.provider,
            subscriptionId: payment.provider === 'paypal' ? user.subscription.paypalSubscriptionId : user.subscription.stripeSubscriptionId,
            paymentId: payment._id,
            amount: payment.amount,
            successful: true
          });
          
          // Send success email
          await emailService.sendPaymentRetrySuccessEmail(user.email, {
            name: user.name,
            planName: user.subscription.plan,
            amount: payment.amount,
            date: now
          });
        } else {
          // Log failure
          await logSubscriptionEvent({
            userId: user._id,
            eventType: 'payment_retry_failed',
            description: `Failed to retry payment (attempt ${payment.retryCount})`,
            planName: user.subscription.plan,
            billingCycle: user.subscription.billingCycle,
            paymentProvider: payment.provider,
            subscriptionId: payment.provider === 'paypal' ? user.subscription.paypalSubscriptionId : user.subscription.stripeSubscriptionId,
            paymentId: payment._id,
            amount: payment.amount,
            successful: false,
            errorMessage: retryResult.error
          });
          
          // If this was the 3rd failure, send a final notice email
          if (payment.retryCount >= 3) {
            await emailService.sendPaymentFinalFailureEmail(user.email, {
              name: user.name,
              planName: user.subscription.plan,
              amount: payment.amount,
              date: now
            });
            
            // Mark the subscription as having payment issues
            await User.findByIdAndUpdate(user._id, {
              'subscription.hasPaymentIssue': true
            });
          }
        }
        
        await payment.save();
      } catch (retryError) {
        console.error(`Error retrying payment ${payment._id}:`, retryError);
        // Continue with next payment
      }
    }
    
    console.log('Payment retry job completed');
  } catch (error) {
    console.error('Error in payment retry job:', error);
  }
};

/**
 * Send upcoming renewal notices
 * Notifies users about upcoming subscription renewals
 */
const sendUpcomingRenewalNoticesJobFn = async () => {
  try {
    console.log('Running upcoming renewal notifications job...');
    const now = new Date();
    
    // Find users with subscriptions renewing in the next 3 days
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(now.getDate() + 3);
    
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(now.getDate() + 1);
    
    // Get users with renewals coming up
    const usersWithRenewals = await User.find({
      'subscription.isActive': true,
      'subscription.endDate': { 
        $gte: now,
        $lte: threeDaysFromNow
      },
      'subscription.paymentType': 'recurring' // Only for recurring subscriptions
    });
    
    console.log(`Found ${usersWithRenewals.length} users with upcoming renewals`);
    
    for (const user of usersWithRenewals) {
      try {
        const endDate = new Date(user.subscription.endDate);
        const daysUntilRenewal = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        // Determine if we've already sent a notification
        const recentNotification = await SubscriptionLog.findOne({
          userId: user._id,
          eventType: 'renewal_notice_sent',
          createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });
        
        if (recentNotification) {
          console.log(`Already sent renewal notice to user ${user._id} in the last 24 hours, skipping`);
          continue;
        }
        
        console.log(`Sending renewal notice to user ${user._id}, renewing in ${daysUntilRenewal} days`);
        
        // Get plan details
        const planName = user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1);
        const plan = await Plan.findOne({ name: planName });
        
        if (!plan) {
          console.error(`Plan not found for user ${user._id}`);
          continue;
        }
        
        // Calculate billing amount based on billing cycle
        const isYearly = user.subscription.billingCycle === 'yearly';
        const renewalAmount = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
        
        // Send email
        await emailService.sendUpcomingRenewalEmail(user.email, {
          name: user.name,
          planName: user.subscription.plan,
          daysUntilRenewal: daysUntilRenewal,
          renewalDate: endDate,
          amount: renewalAmount,
          billingCycle: user.subscription.billingCycle
        });
        
        // Log the notification
        await logSubscriptionEvent({
          userId: user._id,
          eventType: 'renewal_notice_sent',
          description: `Sent renewal notice for subscription renewing in ${daysUntilRenewal} days`,
          planName: user.subscription.plan,
          billingCycle: user.subscription.billingCycle,
          paymentProvider: user.subscription.paypalSubscriptionId ? 'paypal' : 'stripe',
          subscriptionId: user.subscription.paypalSubscriptionId || user.subscription.stripeSubscriptionId,
          amount: renewalAmount,
          successful: true
        });
      } catch (userError) {
        console.error(`Error sending renewal notice to user ${user._id}:`, userError);
        // Continue with next user
      }
    }
    
    console.log('Renewal notification job completed');
  } catch (error) {
    console.error('Error in renewal notification job:', error);
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
  
  // Job to check for expired subscriptions
  checkExpiredSubscriptionsJob = cron.schedule('0 * * * *', async () => { // Run every hour
    console.log('Running job: checkExpiredSubscriptionsJob');
    await checkExpiredSubscriptions();
  }, {
    scheduled: false
  });
  
  // Job to retry failed payments - run every 6 hours
  retryFailedPaymentsJob = cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('Running payment retry job');
      await retryFailedPaymentsJobFn();
    } catch (error) {
      console.error('Error in payment retry job:', error);
    }
  });
  
  // Job to send upcoming renewal notices - run daily at 9 AM
  sendUpcomingRenewalNoticesJob = cron.schedule('0 9 * * *', async () => {
    try {
      console.log('Running upcoming renewal notices job');
      await sendUpcomingRenewalNoticesJobFn();
    } catch (error) {
      console.error('Error in upcoming renewal notices job:', error);
    }
  });
  
  // Start the cron jobs
  resetSubscriptionsJob.start();
  resetCreditCyclesJob.start();
  checkExpiredSubscriptionsJob.start();
  retryFailedPaymentsJob.start();
  sendUpcomingRenewalNoticesJob.start();
  
  console.log('Subscription scheduler initialized with jobs:');
  console.log('- resetCreditCyclesJob: Runs daily at midnight');
  console.log('- resetSubscriptionsJob: Runs daily at 1 AM');
  console.log('- checkExpiredSubscriptionsJob: Runs every hour');
  console.log('- retryFailedPaymentsJob: Runs every 6 hours');
  console.log('- sendUpcomingRenewalNoticesJob: Runs daily at 9 AM');
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
    user.subscription.creditsTotal = plan.creditsTotal;
    
    await user.save();
    
    console.log(`Reset credit cycle for user ${userId}, new credits: ${plan.creditsTotal}`);
    
    return { 
      success: true, 
      user: userId, 
      cycle: {
        start: cycleStartDate,
        end: cycleEndDate
      },
      credits: plan.creditsTotal
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
    const creditDifference = newPlan.creditsTotal - currentPlan.creditsTotal;
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

/**
 * Check for expired subscriptions and downgrade them to free plan
 * Note: This is now primarily for cleanup of any legacy subscriptions
 */
const checkExpiredSubscriptions = async () => {
  try {
    const now = new Date();
    
    // Find any subscriptions that might still be in the legacy cancelAtPeriodEnd state
    const users = await User.find({
      'subscription.cancelAtPeriodEnd': true,
      'subscription.endDate': { $lt: now } // End date is in the past
    });
    
    console.log(`Found ${users.length} legacy subscriptions to properly cancel`);
    
    for (const user of users) {
      console.log(`⏱️ Legacy subscription found. Properly updating user ${user._id} to free plan`);
      
      // Get current subscription details to preserve
      const currentCreditsTotal = user.subscription?.creditsTotal || 0;
      const currentCreditsUsed = user.subscription?.creditsUsed || 0;
      
      // Update user to free plan but keep their remaining credits
      user.subscription.plan = 'free';
      user.subscription.stripeSubscriptionId = null;
      user.subscription.isActive = false; // Mark as inactive when canceled
      user.subscription.creditsTotal = currentCreditsTotal; // Keep their remaining credits
      user.subscription.creditsUsed = currentCreditsUsed; // Keep their used credits
      user.subscription.billingCycle = 'none';
      user.subscription.cancelAtPeriodEnd = false;
      
      await user.save();
      
      console.log(`✅ User ${user._id} subscription properly updated`);
    }
    
    return {
      success: true,
      updated: users.length
    };
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Log subscription events
 */
const logSubscriptionEvent = async (eventData) => {
  try {
    const subscriptionLog = new SubscriptionLog({
      ...eventData,
      createdAt: new Date()
    });
    
    await subscriptionLog.save();
    return subscriptionLog;
  } catch (error) {
    console.error('Error logging subscription event:', error);
    // Don't throw, just log the error
    return null;
  }
};

module.exports = {
  initSubscriptionScheduler,
  resetSubscriptionsJobFn,
  resetCreditCycles,
  resetUserCreditCycle,
  calculateProration,
  resetCreditCyclesJob,
  resetSubscriptionsJob,
  checkExpiredSubscriptions,
  checkExpiredSubscriptionsJob,
  retryFailedPaymentsJobFn,
  sendUpcomingRenewalNoticesJobFn,
  logSubscriptionEvent
}; 