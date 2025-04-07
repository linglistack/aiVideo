const Subscription = require('../models/Subscription');
const User = require('../models/User');
const stripeService = require('../services/stripeService');
const paypalService = require('../services/paypalService');
const Plan = require('../models/Plan');
const aiUser = require('../models/aiUser');
const subscriptionScheduler = require('../services/subscriptionScheduler');
const Payment = require('../models/Payment');

// Ensure dotenv is loaded
require('dotenv').config();

// Initialize Stripe with error handling
let stripe;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} catch (error) {
  console.error('Failed to initialize Stripe in subscriptionController:', error.message);
  stripe = null;
}

// Plan configurations
const PLANS = {
  Starter: {
    price: 19,
    creditsTotal: 10
  },
  Growth: {
    price: 49,
    creditsTotal: 50
  },
  Scale: {
    price: 95,
    creditsTotal: 150
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
      subscription.creditsTotal = PLANS[plan].creditsTotal;
      subscription.creditsUsed = 0; // Reset used credits
      
      await subscription.save();
    } else {
      // Create new subscription
      subscription = await Subscription.create({
        user: req.user._id,
        plan,
        startDate,
        endDate,
        creditsTotal: PLANS[plan].creditsTotal,
        status: 'active'
      });
    }
    
    // Update user's subscription info
    await User.findByIdAndUpdate(req.user._id, {
      subscription: {
        plan,
        startDate,
        endDate,
        creditsTotal: PLANS[plan].creditsTotal,
        creditsUsed: 0
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
    // Store any provided reason for analytics
    const { reason } = req.body;
    
    // Log the cancellation reason if provided
    if (reason) {
      console.log(`User ${req.user._id} cancellation reason: ${reason}`);
      // In a production app, you might want to store this in a database
    }
    
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user has an active subscription
    if (!user.subscription || !user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    // If there's a Stripe subscription ID, cancel it through Stripe
    if (user.subscription.stripeSubscriptionId) {
      // Cancel the subscription in Stripe (at period end)
      const stripeResult = await stripeService.cancelSubscription(user.subscription.stripeSubscriptionId);
      
      if (!stripeResult.success) {
        console.error('Stripe cancellation failed:', stripeResult.error);
        // We'll continue anyway to update our database
      }
    }
    
    // Get current subscription details to preserve
    const currentCreditsTotal = user.subscription.creditsTotal || 0;
    const currentCreditsUsed = user.subscription.creditsUsed || 0;
    
    // Set subscription to free plan but preserve their credits
    user.subscription.plan = 'free';
    user.subscription.isActive = false;
    user.subscription.canceledAt = new Date();
    user.subscription.cancelAtPeriodEnd = false;
    user.subscription.isCanceled = true;
    user.subscription.creditsTotal = currentCreditsTotal; // Keep their remaining credits
    user.subscription.creditsUsed = currentCreditsUsed; // Keep their used credits
    user.subscription.billingCycle = 'none';
    
    await user.save();
    
    console.log(`Subscription for user ${user._id} has been canceled immediately`);
    
    // Return comprehensive response with full subscription details
    res.json({
      success: true,
      message: 'Subscription canceled successfully',
      subscription: {
        ...user.subscription.toObject(),
        // Add explicit flags for client-side clarity
        isCanceled: true,
        cancelAtPeriodEnd: false,
        isActive: false, 
        // Include remaining information for UI updates
        creditsRemaining: Math.max(0, (user.subscription.creditsTotal || 0) - (user.subscription.creditsUsed || 0)),
      },
      cancelDate: user.subscription.canceledAt
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
    
    // Prepare subscription data with all necessary fields
    const subscriptionData = user.subscription.toObject();
    
    console.log('Subscription data before processing:', {
      isActive: subscriptionData.isActive,
      canceledAt: subscriptionData.canceledAt,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
      isCanceled: subscriptionData.isCanceled
    });
    
    // Ensure required fields are present
    const processedSubscriptionData = {
      ...subscriptionData,
      // Ensure these fields exist (using existing values if present, default values if not)
      startDate: subscriptionData.startDate || subscriptionData.cycleStartDate || null,
      endDate: subscriptionData.endDate || subscriptionData.cycleEndDate || null,
      // Properly set cancellation flags based on active status
      isCanceled: subscriptionData.isActive ? false : !!subscriptionData.canceledAt,
      cancelAtPeriodEnd: subscriptionData.isActive ? false : !!subscriptionData.cancelAtPeriodEnd,
      canceledAt: subscriptionData.isActive ? null : subscriptionData.canceledAt,
      // Ensure active status is correct
      isActive: subscriptionData.isActive !== false // Default to true if not explicitly false
    };
    
    console.log('Subscription data after processing:', {
      isActive: processedSubscriptionData.isActive,
      isCanceled: processedSubscriptionData.isCanceled,
      cancelAtPeriodEnd: processedSubscriptionData.cancelAtPeriodEnd
    });
    
    res.json({
      success: true,
      subscription: {
        ...processedSubscriptionData,
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
    const { priceId, paymentMethodId, saveMethod = true, billingCycle } = req.body;
    
    if (!priceId || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID and Payment Method ID are required'
      });
    }
    
    try {
      // Get plan details first - we'll need this later
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
      
      console.log('⚠️ PLAN DETAILS BEFORE CREATING SUBSCRIPTION:', {
        name: plan.name,
        creditsTotal: plan.creditsTotal,
        priceId
      });
      
      // Create the subscription in Stripe
      const subscription = await stripeService.createSubscription(
        req.user._id,
        priceId,
        paymentMethodId,
        saveMethod
      );
      
      console.log('🎉 SUBSCRIPTION CREATED:', {
        id: subscription.id,
        status: subscription.status
      });
      
      // IMPORTANT: Double-check that user's creditsTotal is updated correctly
      // This ensures the database reflects the correct credit amount after manual payment
      const isYearly = billingCycle === 'yearly' || priceId === plan.yearlyPriceId;
      
      // Calculate end date based on billing cycle
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));
      
      // Calculate cycle dates for credits
      const cycleStartDate = new Date();
      const cycleEndDate = new Date();
      cycleEndDate.setDate(cycleEndDate.getDate() + 30); // 30-day credit cycle
      
      // Fetch user first to check current values
      const user = await aiUser.findById(req.user._id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Update user's subscription info directly here for better traceability
      user.subscription = {
        plan: plan.name.toLowerCase(),
        stripeSubscriptionId: subscription.id,
        startDate: new Date(),
        endDate,
        cycleStartDate,
        cycleEndDate,
        creditsTotal: plan.creditsTotal,
        creditsUsed: 0,
        isActive: true,
        billingCycle: isYearly ? 'yearly' : 'monthly',
        paymentMethod: 'stripe',
        paymentType: 'recurring',
        priceId
      };
      
      await user.save();
      
      // Create a payment record directly here, so we don't rely solely on the webhook
      try {
        // Get payment method details
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        
        // Format payment method for storage
        const paymentMethodData = paymentMethod ? {
          id: paymentMethod.id,
          brand: paymentMethod.card?.brand || 'unknown',
          last4: paymentMethod.card?.last4 || '****',
          expMonth: paymentMethod.card?.exp_month?.toString() || '',
          expYear: paymentMethod.card?.exp_year?.toString() || ''
        } : null;
        
        // Get the invoice and payment intent information from the subscription
        const invoiceId = subscription.latest_invoice?.id;
        const paymentIntentId = subscription.latest_invoice?.payment_intent?.id;
        
        // Determine billing cycle (monthly/yearly)
        const isYearly = billingCycle === 'yearly' || priceId === plan.yearlyPriceId;
        
        // Calculate amount based on the plan
        const amount = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
        
        // Create a new payment record
        const paymentRecord = new Payment({
          userId: req.user._id,
          paymentId: paymentIntentId || `pi_manual_${Date.now()}`,
          invoiceId: invoiceId || `in_manual_${Date.now()}`,
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          date: new Date(),
          amount: amount,
          currency: 'usd',
          plan: plan.name,
          billingCycle: isYearly ? 'yearly' : 'monthly',
          status: 'succeeded',
          paymentType: 'recurring',
          receiptUrl: subscription.latest_invoice?.hosted_invoice_url,
          paymentMethod: paymentMethodData,
          metadata: {
            description: `Subscription to ${plan.name} plan (${isYearly ? 'yearly' : 'monthly'})`,
            createdManually: true
          }
        });
        
        await paymentRecord.save();
        console.log(`Payment record created manually for user ${req.user._id}`);
      } catch (paymentRecordError) {
        console.error('Error creating payment record in createPaymentIntent:', paymentRecordError);
        // Continue execution even if payment record creation fails
      }
      
      res.json({
        success: true,
        subscription
      });
    } catch (stripeError) {
      console.error('Stripe error in createPaymentIntent:', stripeError);
      
      // Handle specific Stripe errors
      if (stripeError.message.includes('No such PaymentMethod') || 
          stripeError.message.includes('Invalid payment method')) {
        return res.status(400).json({
          success: false,
          error: `Invalid payment method: The payment method no longer exists or is invalid. Please use a different payment method.`,
          code: 'invalid_payment_method'
        });
      }
      
      // For other Stripe errors, return the error message
      return res.status(400).json({
        success: false,
        error: stripeError.message || 'Error processing payment'
      });
    }
  } catch (error) {
    console.error('Server error in createPaymentIntent:', error);
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
    
    // Get the plan from the subscription
    const priceId = subscription.items.data[0].price.id;
    const plan = await Plan.findOne({
      $or: [
        { monthlyPriceId: priceId },
        { yearlyPriceId: priceId }
      ]
    });
    
    if (!plan) return;
    
    // Determine billing cycle
    const isYearly = priceId === plan.yearlyPriceId;
    
    // Calculate subscription dates
    const startDate = new Date(subscription.current_period_start * 1000);
    const endDate = new Date(subscription.current_period_end * 1000);
    
    // Initialize credit cycle dates
    const cycleStartDate = new Date();
    const cycleEndDate = new Date();
    cycleEndDate.setDate(cycleEndDate.getDate() + 30); // 30-day credit cycle
    
    // Check if this is a renewal or an upgrade
    const isNewSubscription = !user.subscription.stripeSubscriptionId;
    const isRenewal = user.subscription.stripeSubscriptionId === subscription.id && 
                    new Date(subscription.current_period_start * 1000).getTime() > 
                    new Date(user.subscription.startDate).getTime();
    const isUpgrade = !isNewSubscription && !isRenewal;
    
    // Store current creditsUsed for upgrades
    const currentCreditsUsed = user.subscription.creditsUsed || 0;
    
    // Log what type of invoice this is
    console.log('📢 PROCESSING INVOICE PAYMENT:', {
      userId,
      subscriptionId: subscription.id,
      isNewSubscription,
      isRenewal,
      isUpgrade,
      currentCreditsUsed,
      planName: plan.name,
      planCredits: plan.creditsTotal
    });
    
    console.log('👤 USER BEFORE WEBHOOK UPDATE:', {
      id: user._id,
      subscription: {
        plan: user.subscription.plan,
        creditsTotal: user.subscription.creditsTotal,
        creditsUsed: user.subscription.creditsUsed
      }
    });
    
    // Update user with subscription details
    user.subscription.stripeSubscriptionId = subscription.id;
    user.subscription.plan = plan.name.toLowerCase();
    user.subscription.startDate = startDate;
    user.subscription.endDate = endDate;
    user.subscription.cycleStartDate = cycleStartDate;
    user.subscription.cycleEndDate = cycleEndDate;
    user.subscription.isActive = true;
    user.subscription.billingCycle = isYearly ? 'yearly' : 'monthly';
    
    // Reset any cancellation status
    user.subscription.canceledAt = null;
    user.subscription.cancelAtPeriodEnd = false;
    user.subscription.isCanceled = false;
    
    // EXPLICITLY set the creditsTotal from the plan
    user.subscription.creditsTotal = plan.creditsTotal || getPlanCreditLimit(plan.name.toLowerCase());
    console.log(`✅ Setting creditsTotal to ${user.subscription.creditsTotal} via webhook`);
    
    // For upgrades, preserve the creditsUsed count, but update the limit
    if (isUpgrade) {
      user.subscription.creditsUsed = currentCreditsUsed;
    } 
    // For new subscriptions or renewals, reset usage counts
    else {
      user.subscription.creditsUsed = 0;
    }
    
    console.log('👤 SUBSCRIPTION BEFORE WEBHOOK SAVE:', {
      plan: user.subscription.plan,
      creditsTotal: user.subscription.creditsTotal,
      creditsUsed: user.subscription.creditsUsed
    });
    
    await user.save();
    
    // Verify update was successful
    const updatedUserFromWebhook = await aiUser.findById(userId).lean();
    console.log('👤 USER AFTER WEBHOOK SAVE:', {
      id: updatedUserFromWebhook._id,
      subscription: {
        plan: updatedUserFromWebhook.subscription.plan,
        creditsTotal: updatedUserFromWebhook.subscription.creditsTotal,
        creditsUsed: updatedUserFromWebhook.subscription.creditsUsed
      }
    });
    
    // As a final fallback, if creditsTotal is still not correct, 
    // do an explicit forced update to the specific field
    if (!updatedUserFromWebhook.subscription.creditsTotal || 
        updatedUserFromWebhook.subscription.creditsTotal !== user.subscription.creditsTotal) {
      console.log('⚠️ WEBHOOK: SUBSCRIPTION CREDITS NOT UPDATED CORRECTLY, FORCING UPDATE');
      
      await aiUser.updateOne(
        { _id: userId }, 
        { $set: { 'subscription.creditsTotal': user.subscription.creditsTotal } },
        { upsert: false }
      );
      
      // Fetch again to verify
      const finalWebhookUser = await aiUser.findById(userId).lean();
      console.log('👤 USER AFTER WEBHOOK FORCED UPDATE:', {
        id: finalWebhookUser._id,
        subscription: {
          plan: finalWebhookUser.subscription.plan,
          creditsTotal: finalWebhookUser.subscription.creditsTotal,
          creditsUsed: finalWebhookUser.subscription.creditsUsed
        }
      });
    }
    
    // Create a payment record in the database
    try {
      // Get the payment details from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
      const charge = paymentIntent.latest_charge ? 
        await stripe.charges.retrieve(paymentIntent.latest_charge) : null;
      
      // Get payment method details
      let paymentMethod = null;
      if (paymentIntent.payment_method) {
        paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
      }
      
      // Format payment method for storage
      const paymentMethodData = paymentMethod ? {
        id: paymentMethod.id,
        brand: paymentMethod.card?.brand || 'unknown',
        last4: paymentMethod.card?.last4 || '****',
        expMonth: paymentMethod.card?.exp_month?.toString() || '',
        expYear: paymentMethod.card?.exp_year?.toString() || ''
      } : null;
      
      // Create a new payment record
      const paymentRecord = new Payment({
        userId: userId,
        paymentId: invoice.payment_intent,
        invoiceId: invoice.id,
        subscriptionId: subscription.id,
        customerId: customer.id,
        date: new Date(invoice.created * 1000),
        amount: invoice.amount_paid / 100, // Convert from cents to dollars
        currency: invoice.currency,
        plan: plan.name,
        billingCycle: isYearly ? 'yearly' : 'monthly',
        status: 'succeeded',
        paymentType: 'recurring',
        receiptUrl: invoice.hosted_invoice_url || charge?.receipt_url,
        receiptNumber: invoice.number,
        paymentMethod: paymentMethodData,
        metadata: {
          description: invoice.description,
          customerEmail: invoice.customer_email || customer.email,
          customerName: customer.name,
          isUpgrade: isUpgrade
        }
      });
      
      await paymentRecord.save();
      console.log(`Payment record created for user ${userId}, invoice ${invoice.id}${isUpgrade ? ' (upgrade)' : ''}`);
    } catch (paymentError) {
      console.error('Error creating payment record:', paymentError);
      // Continue execution even if payment record creation fails
    }
    
    console.log(`Updated subscription for user ${userId}: Plan ${plan.name}, Credits: ${plan.creditsTotal}`);
  } catch (error) {
    console.error('Error handling invoice payment success:', error);
  }
};

// Helper function to get credit limit for a plan
const getPlanCreditLimit = (planName) => {
  const PLANS = {
    'starter': 10,
    'growth': 50,
    'scale': 150,
    'free': 2
  };
  
  const normalizedName = planName.toLowerCase();
  return PLANS[normalizedName] || 10; // Default to 10 if plan not found
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
    
    console.log(`📅 HANDLING SUBSCRIPTION DELETED for user ${userId}`);
    
    // Get the user
    const user = await aiUser.findById(userId);
    
    if (!user) {
      console.error(`User ${userId} not found for subscription deleted event`);
      return;
    }
    
    console.log('👤 USER SUBSCRIPTION BEFORE DELETION HANDLING:', {
      plan: user.subscription?.plan,
      isActive: user.subscription?.isActive,
      creditsTotal: user.subscription?.creditsTotal,
      creditsUsed: user.subscription?.creditsUsed,
      endDate: user.subscription?.endDate
    });
    
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
    user.subscription.canceledAt = new Date();
    user.subscription.cancelAtPeriodEnd = false;
    
    await user.save();
    
    // Verify update was successful
    const updatedUser = await aiUser.findById(userId).lean();
    console.log('👤 USER AFTER SUBSCRIPTION DELETION HANDLING:', {
      plan: updatedUser.subscription?.plan,
      isActive: updatedUser.subscription?.isActive, 
      creditsTotal: updatedUser.subscription?.creditsTotal,
      creditsUsed: updatedUser.subscription?.creditsUsed,
      endDate: updatedUser.subscription?.endDate
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
    
    // Calculate credit cycle dates (30-day cycle regardless of billing period)
    const cycleStartDate = new Date();
    const cycleEndDate = new Date();
    cycleEndDate.setDate(cycleEndDate.getDate() + 30);
    
    // Update user's subscription info
    await aiUser.findByIdAndUpdate(userId, {
      'subscription.plan': plan.name.toLowerCase(),
      'subscription.stripeSubscriptionId': subscription.id,
      'subscription.startDate': new Date(),
      'subscription.endDate': endDate,
      'subscription.cycleStartDate': cycleStartDate,
      'subscription.cycleEndDate': cycleEndDate,
      'subscription.creditsTotal': plan.creditsTotal,
      'subscription.creditsUsed': 0,
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

// @desc    Get subscription usage stats
// @route   GET /api/subscriptions/usage
// @access  Private
const getSubscriptionUsage = async (req, res) => {
  try {
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const subscription = user.subscription;
    
    // Calculate days until reset
    const today = new Date();
    const cycleEndDate = subscription.cycleEndDate || new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysUntilReset = Math.max(0, Math.ceil((cycleEndDate - today) / (1000 * 60 * 60 * 24)));
    
    // Calculate credits remaining (total - used)
    const creditsRemaining = Math.max(0, (subscription.creditsTotal || 0) - (subscription.creditsUsed || 0));
    
    // Return usage data
    res.json({
      success: true,
      usage: {
        creditsUsed: subscription.creditsUsed || 0,
        creditsTotal: subscription.creditsTotal || 0,
        creditsRemaining: creditsRemaining,
        daysUntilReset: daysUntilReset,
        plan: subscription.plan || 'free',
        planDisplayName: subscription.plan ? 
          subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : 'Free'
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

// @desc    Upgrade user subscription
// @route   POST /api/subscriptions/upgrade
// @access  Private
const upgradeSubscription = async (req, res) => {
  try {
    const { plan: newPlan } = req.body;
    
    if (!newPlan) {
      return res.status(400).json({
        success: false,
        error: 'No plan specified for upgrade'
      });
    }
    
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (!user.subscription || !user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    if (!user.stripeCustomerId || !user.subscription.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No valid Stripe subscription found'
      });
    }
    
    // Get the upgrade plan details
    const upgradePlan = await Plan.findOne({
      name: newPlan.charAt(0).toUpperCase() + newPlan.slice(1)
    });
    
    if (!upgradePlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid upgrade plan selected'
      });
    }
    
    console.log('Current plan:', user.subscription.plan);
    console.log('Upgrade plan:', upgradePlan.name);
    
    // Check if this is actually an upgrade
    if (user.subscription.plan === newPlan.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'You are already on this plan'
      });
    }
    
    // Get the current plan for pricing comparisons
    const currentPlan = await Plan.findOne({
      name: user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1)
    });
    
    if (!currentPlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid current plan'
      });
    }
    
    // Check if the current billing cycle is monthly or yearly
    const isYearly = user.subscription.billingCycle === 'yearly';
    
    // Calculate proration details
    const prorationDetails = await subscriptionScheduler.calculateProration(
      user._id,
      newPlan
    );
    
    // Prepare upgrade in Stripe
    const stripeUpgradeResult = await stripeService.updateSubscription(
      user.stripeCustomerId,
      user.subscription.stripeSubscriptionId,
      isYearly ? upgradePlan.yearlyPriceId : upgradePlan.monthlyPriceId,
      prorationDetails.proratedPrice
    );
    
    if (!stripeUpgradeResult.success) {
      return res.status(400).json({
        success: false,
        error: stripeUpgradeResult.error
      });
    }
    
    // Store the current creditsUsed value
    const currentCreditsUsed = user.subscription.creditsUsed || 0;
    
    // Log relevant info for debugging
    console.log('👤 USER BEFORE UPGRADE:', {
      id: user._id,
      subscription: {
        plan: user.subscription.plan,
        creditsTotal: user.subscription.creditsTotal,
        creditsUsed: currentCreditsUsed
      }
    });
    
    console.log('🔼 UPGRADE PLAN DETAILS:', {
      name: upgradePlan.name,
      creditsTotal: upgradePlan.creditsTotal,
      fallbackLimit: getPlanCreditLimit(newPlan.toLowerCase())
    });
    
    // Update user subscription
    user.subscription.plan = newPlan.toLowerCase();
    
    // EXPLICITLY set the creditsTotal from the plan
    user.subscription.creditsTotal = upgradePlan.creditsTotal || getPlanCreditLimit(newPlan.toLowerCase());
    console.log(`✅ Setting creditsTotal to ${user.subscription.creditsTotal}`);
    
    // Keep the used credits the same
    user.subscription.creditsUsed = currentCreditsUsed;
    
    // Add any additional credits from proration
    if (prorationDetails.additionalCredits && prorationDetails.additionalCredits > 0) {
      user.subscription.creditsTotal += prorationDetails.additionalCredits;
      console.log(`➕ Adding ${prorationDetails.additionalCredits} additional credits from proration, new total: ${user.subscription.creditsTotal}`);
    }
    
    console.log('👤 SUBSCRIPTION BEFORE SAVE:', {
      plan: user.subscription.plan,
      creditsTotal: user.subscription.creditsTotal,
      creditsUsed: user.subscription.creditsUsed
    });
    
    // Save user with updated subscription
    await user.save();
    
    // Verify update was successful
    const updatedUser = await aiUser.findById(user._id).lean();
    console.log('👤 USER AFTER UPGRADE SAVE:', {
      id: updatedUser._id,
      subscription: {
        plan: updatedUser.subscription.plan,
        creditsTotal: updatedUser.subscription.creditsTotal,
        creditsUsed: updatedUser.subscription.creditsUsed
      }
    });
    
    // As a final fallback, if creditsTotal is still not correct, 
    // do an explicit forced update to the specific field
    if (!updatedUser.subscription.creditsTotal || updatedUser.subscription.creditsTotal !== user.subscription.creditsTotal) {
      console.log('⚠️ SUBSCRIPTION CREDITS NOT UPDATED CORRECTLY, FORCING UPDATE');
      
      await aiUser.updateOne(
        { _id: user._id }, 
        { $set: { 'subscription.creditsTotal': user.subscription.creditsTotal } },
        { upsert: false }
      );
      
      // Fetch again to verify
      const finalUser = await aiUser.findById(user._id).lean();
      console.log('👤 USER AFTER FORCED UPDATE:', {
        id: finalUser._id,
        subscription: {
          plan: finalUser.subscription.plan,
          creditsTotal: finalUser.subscription.creditsTotal,
          creditsUsed: finalUser.subscription.creditsUsed
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Subscription upgraded successfully',
      upgrade: prorationDetails,
      subscription: {
        ...updatedUser.subscription,
        creditsRemaining: updatedUser.subscription.creditsTotal - updatedUser.subscription.creditsUsed
      }
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Downgrade user subscription
// @route   POST /api/subscriptions/downgrade
// @access  Private
const downgradeSubscription = async (req, res) => {
  try {
    const { newPlan } = req.body;
    
    if (!newPlan) {
      return res.status(400).json({
        success: false,
        error: 'New plan is required'
      });
    }
    
    const userId = req.user._id;
    const user = await aiUser.findById(userId);
    
    if (!user || !user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        error: 'User does not have an active subscription'
      });
    }
    
    // Check if new plan is actually a downgrade
    const currentPlanName = user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1);
    const newPlanFormatted = newPlan.charAt(0).toUpperCase() + newPlan.slice(1);
    
    // Get plan details
    const [currentPlan, downgradePlan] = await Promise.all([
      Plan.findOne({ name: currentPlanName }),
      Plan.findOne({ name: newPlanFormatted })
    ]);
    
    if (!currentPlan || !downgradePlan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // Verify it's actually a downgrade
    const isYearly = user.subscription.billingCycle === 'yearly';
    const currentPrice = isYearly ? currentPlan.yearlyPrice : currentPlan.monthlyPrice;
    const newPrice = isYearly ? downgradePlan.yearlyPrice : downgradePlan.monthlyPrice;
    
    if (newPrice >= currentPrice) {
      return res.status(400).json({
        success: false,
        error: 'New plan must be a downgrade from current plan'
      });
    }
    
    // Schedule the downgrade to take effect at the end of the current billing cycle
    // No refund is provided for downgrades as per business rules
    const stripeDowngradeResult = await stripeService.scheduleSubscriptionUpdate(
      user.stripeCustomerId,
      user.subscription.stripeSubscriptionId,
      isYearly ? downgradePlan.yearlyPriceId : downgradePlan.monthlyPriceId
    );
    
    if (!stripeDowngradeResult.success) {
      return res.status(400).json({
        success: false,
        error: stripeDowngradeResult.error
      });
    }
    
    // Mark subscription for downgrade at next cycle
    user.subscription.pendingDowngrade = {
      plan: newPlan.toLowerCase(),
      scheduledDate: stripeDowngradeResult.effectiveDate
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Subscription scheduled for downgrade at the end of your billing cycle',
      downgrade: {
        currentPlan: currentPlan.name,
        newPlan: downgradePlan.name,
        effectiveDate: stripeDowngradeResult.effectiveDate
      },
      subscription: user.subscription
    });
  } catch (error) {
    console.error('Error downgrading subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Use one credit from user's subscription
// @route   POST /api/subscriptions/use-credit
// @access  Private
const useCredit = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await aiUser.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user has an active subscription
    if (!user.subscription.isActive) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    // Check if user has available credits
    const creditsRemaining = user.subscription.creditsTotal - user.subscription.creditsUsed;
    
    if (creditsRemaining <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No credits remaining in current cycle',
        nextCycleDate: user.subscription.cycleEndDate
      });
    }
    
    // Increment used credits
    user.subscription.creditsUsed += 1;
    await user.save();
    
    res.json({
      success: true,
      creditsUsed: user.subscription.creditsUsed,
      creditsRemaining: user.subscription.creditsTotal - user.subscription.creditsUsed,
      nextCycleDate: user.subscription.cycleEndDate
    });
  } catch (error) {
    console.error('Error using credit:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Reset user's credit cycle manually (admin only)
// @route   POST /api/subscriptions/reset-cycle/:userId
// @access  Private/Admin
const resetUserCycle = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to perform this action'
      });
    }
    
    const { userId } = req.params;
    
    const result = await subscriptionScheduler.resetUserCreditCycle(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'User credit cycle reset successfully',
      result
    });
  } catch (error) {
    console.error('Error resetting user cycle:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Fix subscription credits (admin only)
// @route   POST /api/subscriptions/fix-credits
// @access  Private/Admin
const fixSubscriptionCredits = async (req, res) => {
  try {
    // Get all users with active subscriptions
    const users = await aiUser.find({
      'subscription.isActive': true
    });
    
    console.log(`Found ${users.length} users with active subscriptions to check`);
    
    const updates = [];
    
    // Process each user
    for (const user of users) {
      // Skip users without a subscription plan
      if (!user.subscription || !user.subscription.plan) continue;
      
      // Get the plan
      const planName = user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1);
      const plan = await Plan.findOne({ name: planName });
      
      if (!plan) {
        console.log(`⚠️ Plan not found for user ${user._id}: ${planName}`);
        continue;
      }
      
      // Check if creditsTotal needs to be updated
      if (user.subscription.creditsTotal === undefined || user.subscription.creditsTotal !== plan.creditsTotal) {
        const oldValue = user.subscription.creditsTotal;
        user.subscription.creditsTotal = plan.creditsTotal;
        await user.save();
        
        updates.push({
          userId: user._id,
          plan: planName,
          oldCreditsTotal: oldValue,
          newCreditsTotal: plan.creditsTotal
        });
        
        console.log(`✅ Updated user ${user._id}: ${planName} - creditsTotal: ${oldValue} → ${plan.creditsTotal}`);
      }
    }
    
    res.json({
      success: true,
      message: `Checked ${users.length} users, updated ${updates.length} subscriptions`,
      updates
    });
  } catch (error) {
    console.error('Error fixing subscription credits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Check for expired subscriptions (admin only)
// @route   POST /api/subscriptions/check-expired
// @access  Private/Admin
const checkExpiredSubscriptionsEndpoint = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to perform this action'
      });
    }
    
    const result = await subscriptionScheduler.checkExpiredSubscriptions();
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: `Checked expired subscriptions, downgraded ${result.downgraded} accounts`,
      result
    });
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Create a PayPal subscription
// @route   POST /api/subscriptions/paypal
// @access  Private
const createPaypalSubscription = async (req, res) => {
  try {
    const { planId, billingCycle, upgradeDetails } = req.body;
    
    // Validate inputs
    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }
    
    // Get plan details from database
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    const user = await aiUser.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Determine price based on billing cycle
    const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    
    // Create PayPal subscription data
    const subscriptionData = {
      plan_id: process.env.NODE_ENV === 'production' 
        ? plan.paypalPlanIdProd 
        : plan.paypalPlanIdTest,
      subscriber: {
        name: {
          given_name: user.name.split(' ')[0] || '',
          surname: user.name.split(' ').slice(1).join(' ') || ''
        },
        email_address: user.email
      },
      application_context: {
        brand_name: 'AI Video',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `${process.env.CLIENT_URL}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`
      }
    };
    
    // Create subscription in PayPal
    const paypalSubscription = await paypalService.createSubscription(subscriptionData);
    
    // Return the subscription ID and approval URL
    res.status(201).json({
      success: true,
      subscriptionId: paypalSubscription.id,
      approvalUrl: paypalSubscription.links.find(link => link.rel === 'approve').href
    });
  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error'
    });
  }
};

// @desc    Confirm PayPal subscription
// @route   POST /api/subscriptions/paypal/confirm
// @access  Private
const confirmPaypalSubscription = async (req, res) => {
  try {
    const { subscriptionId, planId, billingCycle } = req.body;
    
    if (!subscriptionId || !planId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID and Plan ID are required'
      });
    }
    
    // Get plan details
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    // Get subscription details from PayPal
    const paypalSubscriptionDetails = await paypalService.getSubscription(subscriptionId);
    
    if (paypalSubscriptionDetails.status !== 'ACTIVE' && 
        paypalSubscriptionDetails.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: `Subscription is not active. Status: ${paypalSubscriptionDetails.status}`
      });
    }
    
    const user = await aiUser.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    
    // Add 1 month or 1 year based on billing cycle
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Check if user already has an active subscription and update it
    let subscription = await Subscription.findOne({
      user: req.user._id,
      status: 'active'
    });
    
    if (subscription) {
      // Update the existing subscription
      subscription.plan = plan.name;
      subscription.startDate = startDate;
      subscription.endDate = endDate;
      subscription.paymentMethod = 'paypal';
      subscription.paypalSubscriptionId = subscriptionId;
      subscription.billingCycle = billingCycle;
      subscription.creditsTotal = plan.creditLimit;
      subscription.creditsUsed = 0; // Reset on upgrade
      subscription.status = 'active';
      
      await subscription.save();
    } else {
      // Create a new subscription
      subscription = await Subscription.create({
        user: req.user._id,
        plan: plan.name,
        startDate,
        endDate,
        paymentMethod: 'paypal',
        paypalSubscriptionId: subscriptionId,
        billingCycle,
        creditsTotal: plan.creditLimit,
        creditsUsed: 0,
        status: 'active'
      });
    }
    
    // Update user's subscription info
    user.subscription = {
      plan: plan.name,
      isActive: true,
      startDate,
      endDate,
      creditsTotal: plan.creditLimit,
      creditsUsed: 0,
      billingCycle,
      paymentMethod: 'paypal',
      paypalSubscriptionId: subscriptionId
    };
    
    await user.save();
    
    // Create a payment record
    await Payment.create({
      user: req.user._id,
      amount: billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
      currency: 'USD',
      paymentMethod: 'paypal',
      paymentMethodId: subscriptionId,
      description: `${plan.name} Plan (${billingCycle})`,
      status: 'succeeded',
      paymentType: 'recurring',
      receiptUrl: null,
      metadata: {
        description: `Subscription to ${plan.name} plan (${billingCycle})`,
        createdManually: true
      }
    });
    
    res.status(200).json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Error confirming PayPal subscription:', error);
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
  getSubscriptionUsage,
  upgradeSubscription,
  downgradeSubscription,
  useCredit,
  resetUserCycle,
  fixSubscriptionCredits,
  checkExpiredSubscriptionsEndpoint,
  createPaypalSubscription,
  confirmPaypalSubscription
}; 