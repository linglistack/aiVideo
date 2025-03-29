const Subscription = require('../models/Subscription');
const User = require('../models/User');
const stripeService = require('../services/stripeService');
const Plan = require('../models/Plan');
const aiUser = require('../models/aiUser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Plan configurations
const PLANS = {
  starter: {
    price: 19,
    videosLimit: 10
  },
  growth: {
    price: 49,
    videosLimit: 50
  },
  scale: {
    price: 95,
    videosLimit: 150
  }
};

// @desc    Subscribe to a plan
// @route   POST /api/subscriptions
// @access  Private
const createSubscription = async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }
    
    // Calculate end date (1 month from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    // In a real app, you would handle payment here
    // For now, we'll just create the subscription
    
    // Check if user already has a subscription
    let subscription = await Subscription.findOne({ 
      user: req.user._id,
      status: 'active'
    });
    
    if (subscription) {
      // Update existing subscription
      subscription.plan = plan;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.videosLimit = PLANS[plan].videosLimit;
      subscription.videosUsed = 0; // Reset used videos
      
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        user: req.user._id,
        plan,
        startDate,
        endDate,
        videosLimit: PLANS[plan].videosLimit,
        status: 'active'
      });
    }
    
    // Update user's subscription info
    await User.findByIdAndUpdate(req.user._id, {
      subscription: {
        plan,
        startDate,
        endDate,
        videosLimit: PLANS[plan].videosLimit,
        videosUsed: 0
      }
    });
    
    res.status(201).json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get current subscription
// @route   GET /api/subscriptions/current
// @access  Private
const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ 
      user: req.user._id,
      status: 'active'
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Cancel subscription
// @route   DELETE /api/subscriptions/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await stripeService.cancelSubscription(req.user._id);
    
    res.json({
      success: true,
      message: 'Subscription canceled at period end',
      subscription
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// Get all subscription plans
const getPlans = async (req, res) => {
  try {
    // Find all active plans and sort by monthly price
    const plans = await Plan.find({ active: true }).sort('monthlyPrice');
    
    // Add annual savings percentage for each plan
    const plansWithSavings = plans.map(plan => {
      const monthlyCost = plan.monthlyPrice;
      const yearlyCost = plan.yearlyPrice;
      const monthlyTotal = monthlyCost * 12;
      const savingsAmount = monthlyTotal - yearlyCost;
      const savingsPercentage = Math.round((savingsAmount / monthlyTotal) * 100);
      
      return {
        ...plan.toObject(),
        savingsPercentage,
        savingsAmount
      };
    });
    
    res.json({
      success: true,
      plans: plansWithSavings
    });
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// Get user's subscription status
const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Get the plan details
    let planDetails = null;
    if (user.subscription.plan !== 'free') {
      planDetails = await Plan.findOne({ name: user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1) });
    }
    
    res.json({
      success: true,
      subscription: {
        ...user.subscription.toObject(),
        planDetails: planDetails
      }
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// Create checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { priceId, billingCycle } = req.body;
    
    console.log('Creating checkout session with:', { priceId, billingCycle, userId: req.user._id });
    
    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID is required'
      });
    }
    
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing`;
    
    // Get plan details for metadata
    const plan = await Plan.findOne({
      $or: [
        { monthlyPriceId: priceId },
        { yearlyPriceId: priceId }
      ]
    });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found for the provided price ID'
      });
    }
    
    // Determine if this is a monthly or yearly subscription
    const isYearly = priceId === plan.yearlyPriceId;
    
    try {
      const session = await stripeService.createCheckoutSession(
        req.user._id,
        priceId,
        successUrl,
        cancelUrl,
        {
          planName: plan.name,
          billingCycle: isYearly ? 'yearly' : 'monthly'
        }
      );
      
      console.log('Checkout session created successfully:', { sessionId: session.id, url: session.url });
      
      res.json({
        success: true,
        url: session.url
      });
    } catch (stripeError) {
      console.error('Stripe error creating checkout session:', stripeError);
      // Send a more specific error message for better debugging
      return res.status(500).json({
        success: false,
        error: stripeError.message || 'Error creating Stripe checkout session'
      });
    }
  } catch (error) {
    console.error('Server error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// Create payment intent (for custom payment form)
const createPaymentIntent = async (req, res) => {
  try {
    const { priceId, paymentMethodId } = req.body;
    
    if (!priceId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID and Payment Method ID are required'
      });
    }
    
    const subscription = await stripeService.createSubscription(
      req.user._id,
      priceId,
      paymentMethodId
    );
    
    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// Handle Stripe webhook
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Handle the event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

// Helper webhook handlers
const handleInvoicePaymentSucceeded = async (invoice) => {
  // Update subscription status to active and extend end date
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const customer = await stripe.customers.retrieve(invoice.customer);
    const userId = customer.metadata.userId;
    
    const user = await aiUser.findById(userId);
    if (!user) return;
    
    const endDate = new Date();
    const billingCycle = user.subscription.billingCycle;
    endDate.setMonth(endDate.getMonth() + (billingCycle === 'yearly' ? 12 : 1));
    
    await aiUser.findByIdAndUpdate(userId, {
      'subscription.isActive': true,
      'subscription.endDate': endDate
    });
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
};

const handleInvoicePaymentFailed = async (invoice) => {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer);
    const userId = customer.metadata.userId;
    
    // Update user subscription status
    await aiUser.findByIdAndUpdate(userId, {
      'subscription.paymentFailed': true
    });
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
};

const handleSubscriptionDeleted = async (subscription) => {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    const userId = customer.metadata.userId;
    
    // Downgrade to free plan
    await aiUser.findByIdAndUpdate(userId, {
      'subscription.plan': 'free',
      'subscription.stripeSubscriptionId': null,
      'subscription.isActive': false,
      'subscription.videosLimit': 2, // Free tier limit
      'subscription.billingCycle': 'none'
    });
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
};

// Verify session after checkout
const verifySession = async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'customer', 'line_items']
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Get user from customer metadata
    const userId = session.customer.metadata.userId;
    
    // If user ID doesn't match the authenticated user
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to this session'
      });
    }
    
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription.id);
    
    // Get the price that was purchased
    const priceId = subscription.items.data[0].price.id;
    
    // Find the plan associated with this price
    const plan = await Plan.findOne({
      $or: [
        { monthlyPriceId: priceId },
        { yearlyPriceId: priceId }
      ]
    });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found for this subscription'
      });
    }
    
    // Calculate end date based on billing cycle
    const isYearly = priceId === plan.yearlyPriceId;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));
    
    // Update user's subscription info
    await aiUser.findByIdAndUpdate(userId, {
      'subscription.plan': plan.name.toLowerCase(),
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.startDate': new Date(),
      'subscription.endDate': endDate,
      'subscription.videosLimit': plan.videosLimit,
      'subscription.videosUsed': 0,
      'subscription.isActive': true,
      'subscription.billingCycle': isYearly ? 'yearly' : 'monthly',
      'subscription.price': isYearly ? plan.yearlyPrice / 12 : plan.monthlyPrice, // monthly equivalent price
      'subscription.actualPrice': isYearly ? plan.yearlyPrice : plan.monthlyPrice, // actual charged price
      'subscription.priceId': priceId
    });
    
    res.json({
      success: true,
      subscription: {
        plan: plan.name,
        billingCycle: isYearly ? 'yearly' : 'monthly',
        startDate: new Date(),
        endDate: endDate
      }
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// Create billing portal session
const createBillingPortalSession = async (req, res) => {
  try {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const returnUrl = req.body.returnUrl || `${baseUrl}/account/subscription`;
    
    const session = await stripeService.createBillingPortalSession(
      req.user._id,
      returnUrl
    );
    
    res.json({
      success: true,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// Get user's subscription usage stats
const getSubscriptionUsage = async (req, res) => {
  try {
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const subscription = user.subscription || {};
    
    // Calculate videos remaining
    const videosRemaining = Math.max(0, (subscription.videosLimit || 0) - (subscription.videosUsed || 0));
    
    // Calculate days until reset
    let daysUntilReset = null;
    if (subscription.endDate) {
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      
      // Reset hours to compare just the dates
      now.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      const diffTime = endDate - now;
      daysUntilReset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    res.json({
      success: true,
      usage: {
        videosUsed: subscription.videosUsed || 0,
        videosLimit: subscription.videosLimit || 0,
        videosRemaining: videosRemaining,
        plan: subscription.plan || 'free',
        isActive: subscription.isActive || false,
        endDate: subscription.endDate,
        daysUntilReset,
        billingCycle: subscription.billingCycle || 'none'
      }
    });
  } catch (error) {
    console.error('Error getting subscription usage:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

module.exports = { 
  createSubscription, 
  getCurrentSubscription, 
  cancelSubscription,
  PLANS,
  getPlans,
  getSubscriptionStatus,
  createCheckoutSession,
  createPaymentIntent,
  handleWebhook,
  verifySession,
  createBillingPortalSession,
  getSubscriptionUsage
}; 