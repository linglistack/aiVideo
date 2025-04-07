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
const axios = require('axios');
const paypalService = require('../services/paypalService');
const aiUser = require('../models/aiUser');
const SubscriptionLog = require('../models/SubscriptionLog');
const Payment = require('../models/Payment');

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
    if (process.env.NODE_ENV === 'production') {
      try {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID;
        if (!webhookId) {
          console.error('PayPal webhook ID not configured');
          return res.status(500).send('Webhook configuration error');
        }
        
        // Get PayPal webhook headers
        const transmissionId = req.headers['paypal-transmission-id'];
        const timestamp = req.headers['paypal-transmission-time'];
        const signature = req.headers['paypal-transmission-sig'];
        const certUrl = req.headers['paypal-cert-url'];
        
        if (!transmissionId || !timestamp || !signature || !certUrl) {
          console.error('Missing PayPal webhook headers');
          return res.status(400).send('Missing webhook headers');
        }
        
        // Verify the webhook signature using PayPal API
        const accessToken = await paypalService.getAccessToken();
        
        const verificationResponse = await axios({
          method: 'post',
          url: `${process.env.NODE_ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'}/v1/notifications/verify-webhook-signature`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          data: {
            transmission_id: transmissionId,
            transmission_time: timestamp,
            cert_url: certUrl,
            auth_algo: req.headers['paypal-auth-algo'],
            transmission_sig: signature,
            webhook_id: webhookId,
            webhook_event: event
          }
        });
        
        if (verificationResponse.data.verification_status !== 'SUCCESS') {
          console.error('PayPal webhook signature verification failed:', verificationResponse.data);
          return res.status(400).send('Webhook signature verification failed');
        }
        
        console.log('PayPal webhook signature verified successfully');
      } catch (verificationError) {
        console.error('Error verifying PayPal webhook signature:', verificationError);
        return res.status(400).send('Webhook verification error');
      }
    }
    
    // Handle different event types
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        console.log('PayPal subscription created:', event.resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        console.log('PayPal subscription activated:', event.resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.UPDATED':
        console.log('PayPal subscription updated:', event.resource.id);
        break;
        
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        console.log('PayPal subscription ended:', event.resource.id);
        
        // Find and update user with this subscription
        const user = await aiUser.findOne({
          'subscription.paypalSubscriptionId': event.resource.id
        });
        
        if (user) {
          // Log this cancellation
          await SubscriptionLog.create({
            userId: user._id,
            eventType: 'subscription_cancelled',
            description: `PayPal subscription cancelled via webhook: ${event.event_type}`,
            planName: user.subscription.plan,
            billingCycle: user.subscription.billingCycle,
            paymentProvider: 'paypal',
            subscriptionId: event.resource.id,
            successful: true
          });
          
          // Mark subscription as cancelled at period end
          user.subscription.cancelAtPeriodEnd = true;
          await user.save();
          
          // Try to send cancellation email
          try {
            const emailService = require('../services/emailService');
            await emailService.sendSubscriptionCancellationEmail(user.email, {
              name: user.name,
              planName: user.subscription.plan,
              endDate: user.subscription.endDate
            });
          } catch (emailError) {
            console.error('Error sending cancellation email:', emailError);
          }
        }
        break;
        
      case 'PAYMENT.SALE.COMPLETED':
        console.log('PayPal payment completed for subscription');
        
        // If we have custom data, extract the user ID and plan info
        if (event.resource && event.resource.custom) {
          try {
            const customData = JSON.parse(event.resource.custom);
            
            if (customData.userId) {
              // Record the payment
              const payment = await Payment.create({
                userId: customData.userId,
                amount: event.resource.amount.total,
                currency: event.resource.amount.currency,
                provider: 'paypal',
                paypalTransactionId: event.resource.id,
                status: 'complete',
                description: `PayPal payment for ${customData.planName || 'subscription'}`,
                metadata: {
                  paypalResource: event.resource
                }
              });
              
              // Log the payment
              await SubscriptionLog.create({
                userId: customData.userId,
                eventType: 'payment_succeeded',
                description: `PayPal payment completed: ${event.resource.id}`,
                planName: customData.planName,
                paymentProvider: 'paypal',
                amount: parseFloat(event.resource.amount.total),
                successful: true,
                paymentId: payment._id
              });
              
              // Try to send success email
              const user = await aiUser.findById(customData.userId);
              if (user) {
                try {
                  const emailService = require('../services/emailService');
                  await emailService.sendPaymentSuccessEmail(user.email, {
                    name: user.name,
                    planName: customData.planName,
                    amount: parseFloat(event.resource.amount.total),
                    date: new Date(),
                    transactionId: event.resource.id
                  });
                } catch (emailError) {
                  console.error('Error sending payment success email:', emailError);
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing PayPal custom data:', parseError);
          }
        }
        break;
      
      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED':
      case 'PAYMENT.SALE.REVERSED':
        console.log(`PayPal payment ${event.event_type.split('.').pop().toLowerCase()}: ${event.resource.id}`);
        
        // If we have custom data, extract the user ID and plan info
        if (event.resource && event.resource.custom) {
          try {
            const customData = JSON.parse(event.resource.custom);
            
            if (customData.userId) {
              // Record the payment issue
              const payment = await Payment.create({
                userId: customData.userId,
                amount: event.resource.amount.total,
                currency: event.resource.amount.currency,
                provider: 'paypal',
                paypalTransactionId: event.resource.id,
                status: 'failed',
                description: `PayPal payment ${event.event_type.split('.').pop().toLowerCase()} for ${customData.planName || 'subscription'}`,
                errorMessage: event.summary || event.event_type,
                metadata: {
                  paypalResource: event.resource
                }
              });
              
              // Log the payment issue
              await SubscriptionLog.create({
                userId: customData.userId,
                eventType: 'payment_failed',
                description: `PayPal payment ${event.event_type.split('.').pop().toLowerCase()}: ${event.resource.id}`,
                planName: customData.planName,
                paymentProvider: 'paypal',
                amount: parseFloat(event.resource.amount.total),
                successful: false,
                errorMessage: event.summary || event.event_type,
                paymentId: payment._id
              });
              
              // Try to send failure email
              const user = await aiUser.findById(customData.userId);
              if (user) {
                try {
                  const emailService = require('../services/emailService');
                  await emailService.sendPaymentFailureEmail(user.email, {
                    name: user.name,
                    planName: customData.planName,
                    amount: parseFloat(event.resource.amount.total),
                    date: new Date(),
                    errorMessage: event.summary || event.event_type
                  });
                } catch (emailError) {
                  console.error('Error sending payment failure email:', emailError);
                }
              }
            }
          } catch (parseError) {
            console.error('Error parsing PayPal custom data:', parseError);
          }
        }
        break;
        
      default:
        console.log('Unhandled PayPal webhook event:', event.event_type);
    }
    
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