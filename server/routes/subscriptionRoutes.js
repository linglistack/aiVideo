const express = require('express');
const router = express.Router();
const { 
  getPlans, 
  createCheckoutSession,
  createPaymentIntent,
  getSubscriptionStatus,
  cancelSubscription, 
  handleWebhook,
  verifySession,
  createBillingPortalSession,
  getSubscriptionUsage,
  upgradeSubscription,
  downgradeSubscription,
  useCredit,
  resetUserCycle,
  fixSubscriptionCredits,
  checkExpiredSubscriptionsEndpoint,
  createPaypalSubscription,
  confirmPaypalSubscription
} = require('../controllers/subscriptionController');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all subscription plans
router.get('/plans', getPlans);

// Get user's subscription status
router.get('/status', protect, getSubscriptionStatus);

// Get user's subscription usage statistics
router.get('/usage', protect, getSubscriptionUsage);

// Create checkout session
router.post('/create-checkout-session', protect, createCheckoutSession);

// Create payment intent (for custom payment form)
router.post('/create-payment-intent', protect, createPaymentIntent);

// Create PayPal subscription
router.post('/paypal', protect, createPaypalSubscription);

// Confirm PayPal subscription
router.post('/paypal/confirm', protect, confirmPaypalSubscription);

// Record PayPal subscription
router.post('/paypal/record', protect, async (req, res) => {
  try {
    const { subscriptionId, planId, billingCycle, planName, price, vaultInfo } = req.body;
    
    if (!subscriptionId || !planId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID and Plan ID are required'
      });
    }
    
    // Get the user
    const user = await require('../models/aiUser').findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get the plan
    const plan = await require('../models/Plan').findById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // Determine if this is a recurring subscription or one-time payment
    // PayPal subscription IDs typically start with "I-"
    const isRecurring = subscriptionId.startsWith('I-');
    const paymentType = isRecurring ? 'recurring' : 'one-time';
    
    console.log(`Recording PayPal payment: ${paymentType} (ID: ${subscriptionId})`);
    
    // Extract vault info if available
    const paypalVaultInfo = vaultInfo || {};
    console.log('PayPal Vault Info:', paypalVaultInfo);
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Create or update subscription in database
    let subscription = await require('../models/Subscription').findOne({
      user: req.user._id,
      status: 'active'
    });
    
    if (subscription) {
      // Update existing subscription
      subscription.plan = planName;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.paymentMethod = 'paypal';
      subscription.paypalSubscriptionId = subscriptionId;
      subscription.billingCycle = billingCycle;
      subscription.creditsTotal = plan.creditLimit;
      subscription.creditsUsed = 0;
      subscription.paymentType = paymentType;
      
      // Add vault info if available
      if (paypalVaultInfo.payerID) {
        subscription.paypalPayerID = paypalVaultInfo.payerID;
      }
      if (paypalVaultInfo.billingToken) {
        subscription.paypalBillingToken = paypalVaultInfo.billingToken;
      }
      
      await subscription.save();
    } else {
      // Create new subscription
      const newSubscription = {
        user: req.user._id,
        plan: planName,
        startDate,
        endDate,
        paymentMethod: 'paypal',
        paypalSubscriptionId: subscriptionId,
        billingCycle,
        creditsTotal: plan.creditLimit,
        creditsUsed: 0,
        status: 'active',
        paymentType: paymentType
      };
      
      // Add vault info if available
      if (paypalVaultInfo.payerID) {
        newSubscription.paypalPayerID = paypalVaultInfo.payerID;
      }
      if (paypalVaultInfo.billingToken) {
        newSubscription.paypalBillingToken = paypalVaultInfo.billingToken;
      }
      
      subscription = await require('../models/Subscription').create(newSubscription);
    }
    
    // Update user's subscription data
    const userSubscriptionUpdate = {
      plan: planName,
      isActive: true,
      startDate,
      endDate,
      creditsTotal: plan.creditLimit,
      creditsUsed: 0,
      billingCycle,
      paymentMethod: 'paypal',
      paypalSubscriptionId: subscriptionId,
      paymentType: paymentType
    };
    
    // Add vault info to user data if available
    if (paypalVaultInfo.payerID) {
      userSubscriptionUpdate.paypalPayerID = paypalVaultInfo.payerID;
    }
    if (paypalVaultInfo.billingToken) {
      userSubscriptionUpdate.paypalBillingToken = paypalVaultInfo.billingToken;
    }
    if (paypalVaultInfo.email) {
      userSubscriptionUpdate.paypalEmail = paypalVaultInfo.email;
    }
    
    user.subscription = userSubscriptionUpdate;
    await user.save();
    
    // Create payment record
    const paymentRecord = {
      user: req.user._id,
      amount: price,
      currency: 'USD',
      paymentMethod: 'paypal',
      paymentMethodId: subscriptionId,
      description: `${planName} Plan (${billingCycle})`,
      status: 'succeeded',
      date: new Date(),
      paymentType: paymentType
    };
    
    // Add vault info to payment record if available
    if (paypalVaultInfo.payerID) {
      paymentRecord.paypalPayerID = paypalVaultInfo.payerID;
    }
    if (paypalVaultInfo.billingToken) {
      paymentRecord.paypalBillingToken = paypalVaultInfo.billingToken;
    }
    if (paypalVaultInfo.email) {
      paymentRecord.paypalEmail = paypalVaultInfo.email;
    }
    
    await require('../models/Payment').create(paymentRecord);
    
    res.status(200).json({
      success: true,
      subscription,
      vaultEnabled: !!paypalVaultInfo.payerID
    });
  } catch (error) {
    console.error('Error recording PayPal subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
});

// Cancel subscription
router.delete('/cancel', protect, cancelSubscription);

// Upgrade subscription
router.post('/upgrade', protect, upgradeSubscription);

// Downgrade subscription
router.post('/downgrade', protect, downgradeSubscription);

// Use one credit from subscription
router.post('/use-credit', protect, useCredit);

// Reset user's credit cycle (admin only)
router.post('/reset-cycle/:userId', protect, resetUserCycle);

// Fix subscription credits (admin only)
router.post('/fix-credits', protect, admin, fixSubscriptionCredits);

// Check expired subscriptions (admin only)
router.post('/check-expired', protect, admin, checkExpiredSubscriptionsEndpoint);

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// PayPal webhook for subscription events
router.post('/paypal/webhook', express.json(), async (req, res) => {
  try {
    const event = req.body;
    console.log('PayPal webhook received:', event.event_type);
    
    // Verify webhook signature in production
    // This would be implemented using PayPal's verification methods
    
    // Handle different event types
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        // Subscription was created
        console.log('PayPal subscription created:', event.resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        // Subscription was activated
        console.log('PayPal subscription activated:', event.resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.UPDATED':
        // Subscription was updated
        console.log('PayPal subscription updated:', event.resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        // Subscription ended or was cancelled
        console.log('PayPal subscription ended:', event.resource.id);
        
        // Find the subscription in our database
        const subscription = await require('../models/Subscription').findOne({
          paypalSubscriptionId: event.resource.id
        });
        
        if (subscription) {
          // Update subscription status
          subscription.status = 'cancelled';
          await subscription.save();
          
          // Update user's subscription data
          const user = await require('../models/aiUser').findById(subscription.user);
          if (user) {
            user.subscription.isActive = false;
            await user.save();
          }
        }
        break;
        
      case 'PAYMENT.SALE.COMPLETED':
        // Payment for subscription was successful
        console.log('PayPal payment completed for subscription');
        // Process renewal if needed
        break;
        
      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED':
      case 'PAYMENT.SALE.REVERSED':
        // Payment failed or was refunded
        console.log('PayPal payment issue:', event.event_type);
        break;
        
      default:
        console.log('Unhandled PayPal webhook event:', event.event_type);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    res.status(500).send('Webhook error');
  }
});

// Add the verify session route
router.get('/verify-session', protect, verifySession);

// Create billing portal session
router.post('/create-billing-portal', protect, createBillingPortalSession);

module.exports = router; 