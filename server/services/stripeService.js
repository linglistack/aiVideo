const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const aiUser = require('../models/aiUser');
const Plan = require('../models/Plan');

// Create a Stripe customer
const createCustomer = async (user) => {
  try {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user._id.toString()
      }
    });
    
    // Update user with Stripe customer ID
    await aiUser.findByIdAndUpdate(user._id, {
      'stripeCustomerId': customer.id
    });
    
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

// Get or create Stripe customer
const getOrCreateCustomer = async (userId) => {
  try {
    const user = await aiUser.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.stripeCustomerId) {
      // Retrieve existing customer
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      
      if (!customer.deleted) {
        return customer;
      }
    }
    
    // Create new customer if not exists or was deleted
    return createCustomer(user);
  } catch (error) {
    console.error('Error getting/creating customer:', error);
    throw error;
  }
};

// Create a subscription
const createSubscription = async (userId, priceId, paymentMethodId) => {
  try {
    const customer = await getOrCreateCustomer(userId);
    
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });
    
    // Set this payment method as the default
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    
    // Get plan details
    const plan = await Plan.findOne({
      $or: [
        { monthlyPriceId: priceId },
        { yearlyPriceId: priceId }
      ]
    });
    
    if (!plan) {
      throw new Error('Plan not found for the provided price ID');
    }
    
    // Determine if this is a monthly or yearly subscription
    const isYearly = priceId === plan.yearlyPriceId;
    
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId,
        planName: plan.name,
        billingCycle: isYearly ? 'yearly' : 'monthly'
      }
    });
    
    // Calculate end date based on billing cycle
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
    
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

// Cancel a subscription
const cancelSubscription = async (userId) => {
  try {
    const user = await aiUser.findById(userId);
    
    if (!user?.subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }
    
    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );
    
    // Update user record
    await aiUser.findByIdAndUpdate(userId, {
      'subscription.isActive': false,
      'subscription.canceledAt': new Date()
    });
    
    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

// Create a checkout session
const createCheckoutSession = async (userId, priceId, successUrl, cancelUrl, metadata = {}) => {
  try {
    const customer = await getOrCreateCustomer(userId);
    
    // Create session with subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          userId,
          ...metadata
        }
      }
    });
    
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Create a customer portal session for managing billing
const createBillingPortalSession = async (userId, returnUrl) => {
  try {
    const customer = await getOrCreateCustomer(userId);
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });
    
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
};

module.exports = {
  createCustomer,
  getOrCreateCustomer,
  createSubscription,
  cancelSubscription,
  createCheckoutSession,
  createBillingPortalSession
}; 