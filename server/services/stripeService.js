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
const createSubscription = async (userId, priceId, paymentMethodId, saveMethod = true) => {
  try {
    const customer = await getOrCreateCustomer(userId);
    
    try {
      // First validate the payment method exists
      const paymentMethodCheck = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (!paymentMethodCheck || paymentMethodCheck.id !== paymentMethodId) {
        throw new Error(`Invalid payment method: ${paymentMethodId}`);
      }
      
      // Attach payment method to customer
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
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
          userId: userId.toString(),
          planName: plan.name,
          billingCycle: isYearly ? 'yearly' : 'monthly'
        }
      });
      
      // Calculate end date based on billing cycle
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));
      
      // Update user's subscription info
      const updateData = {
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
      };
      
      // If saveMethod is true, also save the payment method to the user model
      if (saveMethod && paymentMethod) {
        // Format payment method details
        const paymentMethodData = {
          id: paymentMethod.id,
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year,
          createdAt: new Date()
        };
        
        // Save to user model
        updateData.paymentMethod = paymentMethodData;
        
        // Update paymentMethods array
        const user = await aiUser.findById(userId);
        
        if (user) {
          // Initialize paymentMethods array if it doesn't exist
          if (!user.paymentMethods) {
            user.paymentMethods = [];
          }
          
          // Check if the payment method already exists
          const methodExists = user.paymentMethods.some(
            method => method.id === paymentMethod.id
          );
          
          // Add to array if it doesn't exist
          if (!methodExists) {
            user.paymentMethods.push(paymentMethodData);
            updateData.paymentMethods = user.paymentMethods;
          }
        }
      }
      
      // Update the user with all the data
      await aiUser.findByIdAndUpdate(userId, updateData);
      
      return subscription;
    } catch (stripeError) {
      // Enhanced error handling for payment method errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        if (stripeError.message.includes('No such PaymentMethod')) {
          // Clean up the invalid payment method from user records
          try {
            const user = await aiUser.findById(userId);
            if (user && user.paymentMethods) {
              // Remove the invalid payment method from user's saved methods
              user.paymentMethods = user.paymentMethods.filter(
                method => method.id !== paymentMethodId
              );
              
              // If this was the default payment method, clear it
              if (user.paymentMethod && user.paymentMethod.id === paymentMethodId) {
                user.paymentMethod = user.paymentMethods.length > 0 ? 
                  user.paymentMethods[0] : null;
              }
              
              await user.save();
              console.log(`Removed invalid payment method ${paymentMethodId} from user ${userId}`);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up invalid payment method:', cleanupError);
          }
        }
      }
      
      // Re-throw with additional context
      throw new Error(`Stripe error: ${stripeError.message}`);
    }
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
    
    // Update user record with comprehensive cancellation details
    await aiUser.findByIdAndUpdate(userId, {
      'subscription.isActive': false,
      'subscription.canceledAt': new Date(),
      'subscription.status': 'canceled',
      'subscription.cancelAtPeriodEnd': true,
      'subscription.isCanceled': true
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
          userId: userId.toString(),
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