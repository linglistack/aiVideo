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
  resetUserCycle
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

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Add the verify session route
router.get('/verify-session', protect, verifySession);

// Create billing portal session
router.post('/create-billing-portal', protect, createBillingPortalSession);

module.exports = router; 