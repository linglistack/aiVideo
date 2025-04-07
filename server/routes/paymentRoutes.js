const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const aiUser = require('../models/aiUser');
const Payment = require('../models/Payment');
// Ensure dotenv is loaded
require('dotenv').config();

// Initialize Stripe with error handling
let stripe;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} catch (error) {
  console.error('Failed to initialize Stripe in paymentRoutes:', error.message);
  stripe = null;
}

// Load payment history from database instead of file
let paymentHistory = {};

// Helper function to get payment history from database
const getPaymentHistory = async (userId) => {
  try {
    const payments = await Payment.find({ userId });
    if (payments.length > 0) {
      const history = {};
      payments.forEach(payment => {
        history[payment.paymentId] = payment.toObject();
      });
      return history;
    }
    return {};
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return {};
  }
};

// Helper function to save payment history to database
const savePaymentHistoryToDatabase = async (userId, paymentId, paymentData) => {
  try {
    await Payment.findOneAndUpdate(
      { userId, paymentId },
      paymentData,
      { upsert: true, new: true }
    );
    return true;
  } catch (error) {
    console.error('Error saving payment to database:', error);
    return false;
  }
};

/**
 * @route   POST /api/payments/methods
 * @desc    Save a payment method
 * @access  Private
 */
router.post('/methods', protect, async (req, res) => {
  try {
    const { id, type, brand, last4, expMonth, expYear, nameOnCard, isDefault } = req.body;
    
    // Basic validation
    if (!type || !brand || !last4) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment method information'
      });
    }
    
    // Validate payment method ID - it must be a real Stripe payment method ID for card payments
    // PayPal payments don't need a Stripe payment method ID
    if (type !== 'paypal' && (!id || !id.startsWith('pm_'))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method ID format. Must be a valid Stripe payment method ID.'
      });
    }
    
    // Generate a unique ID for PayPal if not provided
    const paymentMethodId = type === 'paypal' && !id ? 
      `pp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}` : 
      id;
    
    // Format the payment method for storage
    const paymentMethod = {
      id: paymentMethodId, // Use the generated ID for PayPal if needed
      type,
      brand,
      last4,
      expMonth,
      expYear,
      email: req.body.email, // Add email for PayPal methods
      nameOnCard: nameOnCard || req.user.name,
      isDefault: isDefault === true ? true : false, // Respect explicit isDefault flag, default to false
      createdAt: new Date()
    };
    
    // Find the user in database
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Initialize payment methods array if it doesn't exist
    if (!user.paymentMethods) {
      user.paymentMethods = [];
    }
    
    // First check for duplicate PayPal accounts or cards with same last4 and brand
    const isDuplicate = user.paymentMethods.some(method => 
      (method.type === 'paypal' && type === 'paypal' && method.email === req.body.email) ||
      (method.type === 'card' && type === 'card' && method.brand === brand && method.last4 === last4)
    );
    
    // If it's a duplicate, don't save but don't return an error
    if (isDuplicate) {
      return res.status(200).json({
        success: true,
        message: 'Payment method already exists',
        paymentMethod: paymentMethod
      });
    }
    
    // Check if this exact payment method ID already exists
    const existingMethodIndex = user.paymentMethods.findIndex(
      pm => pm.id === paymentMethod.id
    );
    
    if (existingMethodIndex !== -1) {
      // Update the existing method
      user.paymentMethods[existingMethodIndex] = {
        ...user.paymentMethods[existingMethodIndex],
        ...paymentMethod
      };
    } else {
      // Add the new payment method to the array
      user.paymentMethods.push(paymentMethod);
    }
    
    // If this payment method should be set as default (explicitly requested or following rules)
    if (paymentMethod.isDefault || (type === 'card' && !user.paymentMethod)) {
      // First, reset any existing default methods
      user.paymentMethods.forEach(method => {
        if (method.id !== paymentMethodId) {
          method.isDefault = false;
        }
      });
      
      // Set new method as default (redundant if paymentMethod.isDefault is already true,
      // but ensures consistent state)
      const methodToMakeDefault = existingMethodIndex !== -1 
        ? user.paymentMethods[existingMethodIndex] 
        : user.paymentMethods[user.paymentMethods.length - 1];
        
      // Explicitly set isDefault to true
      methodToMakeDefault.isDefault = true;
      
      // Verify it's set in the database object
      console.log('Setting default payment method:', {
        id: methodToMakeDefault.id,
        isDefault: methodToMakeDefault.isDefault
      });
      
      user.paymentMethod = methodToMakeDefault;
      user.defaultPaymentMethodId = paymentMethodId;
    }
    
    // Save to database
    await user.save();
    
    // Log payment method details for debugging
    console.log('Saved payment method with details:', {
      id: paymentMethod.id,
      isDefault: paymentMethod.isDefault,
      paymentMethodInUser: user.paymentMethods.find(m => m.id === paymentMethod.id)?.isDefault,
      defaultMethodId: user.defaultPaymentMethodId
    });
    
    // Update user object in request for subsequent middleware
    req.user = user;
    
    res.status(201).json({
      success: true,
      paymentMethod: paymentMethod,
      defaultMethod: user.paymentMethod,
      isDefault: paymentMethod.isDefault
    });
  } catch (error) {
    console.error('Save payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save payment method'
    });
  }
});

/**
 * @route   GET /api/payments/methods
 * @desc    Get user's payment methods
 * @access  Private
 */
router.get('/methods', protect, async (req, res) => {
  try {
    // Find user in database
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Return user's payment methods
    const userPaymentMethods = user.paymentMethods || [];
    
    // Mark default payment method in the returned array
    const methodsWithDefaultFlag = userPaymentMethods.map(method => {
      // Make sure to preserve the isDefault property
      const methodObj = method.toObject ? method.toObject() : { ...method };
      return {
        ...methodObj,
        isDefault: method.isDefault === true
      };
    });
    
    // Log payment methods for debugging
    console.log('Returning payment methods to client:', {
      count: methodsWithDefaultFlag.length,
      methods: methodsWithDefaultFlag.map(m => ({
        id: m.id,
        isDefault: m.isDefault
      })),
      defaultMethodId: user.defaultPaymentMethodId
    });
    
    res.json({
      success: true,
      methods: methodsWithDefaultFlag,
      defaultMethod: user.paymentMethod,
      defaultPaymentMethodId: user.defaultPaymentMethodId
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods'
    });
  }
});

/**
 * @route   DELETE /api/payments/methods/:id
 * @desc    Delete a payment method
 * @access  Private
 */
router.delete('/methods/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user in database
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user has payment methods
    if (!user.paymentMethods || user.paymentMethods.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    // Find and remove the payment method
    const initialLength = user.paymentMethods.length;
    user.paymentMethods = user.paymentMethods.filter(
      method => method.id !== id
    );
    
    if (user.paymentMethods.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    // If the deleted method was the user's default payment method, clear it
    if (user.paymentMethod && user.paymentMethod.id === id) {
      user.paymentMethod = user.paymentMethods.length > 0 
        ? user.paymentMethods[0]  // Set first remaining as default
        : null;                   // Or null if none left
      
      // Also update the ID reference
      user.defaultPaymentMethodId = user.paymentMethod ? user.paymentMethod.id : null;
      
      // If we have remaining methods, set a new default
      if (user.paymentMethods.length > 0) {
        // First remove isDefault from all
        user.paymentMethods.forEach(method => {
          method.isDefault = false;
        });
        
        // Set the first one as default
        user.paymentMethods[0].isDefault = true;
      }
    }
    
    // Save changes to database
    await user.save();
    
    // Update user object in request for subsequent middleware
    req.user = user;
    
    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment method'
    });
  }
});

/**
 * @route   GET /api/payments/history
 * @desc    Get user's payment history
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
  try {
    // Find payment records for this user in the database
    const userPayments = await Payment.find({ 
      userId: req.user._id 
    }).sort({ date: -1 }); // Sort by date in descending order (newest first)
    
    // Map payment records to the format expected by the frontend
    const paymentHistory = userPayments.map(payment => ({
      id: payment.paymentId,
      invoiceId: payment.invoiceId,
      date: payment.date,
      amount: payment.amount,
      plan: payment.plan,
      billingCycle: payment.billingCycle,
      status: payment.status,
      receiptUrl: payment.receiptUrl,
      receiptNumber: payment.receiptNumber
    }));
    
    // Return payment history - no mock data
    res.json({
      success: true,
      payments: paymentHistory
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment history'
    });
  }
});

// Helper function to determine card brand from card number
function getBrandFromCardNumber(cardNumber) {
  // Basic detection based on card number prefixes
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  if (/^4/.test(cleanNumber)) return 'visa';
  if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
  if (/^3[47]/.test(cleanNumber)) return 'amex';
  if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';
  
  return 'unknown';
}

/**
 * @route   PUT /api/payments/methods/default
 * @desc    Set a payment method as default
 * @access  Private
 */
router.put('/methods/default', protect, async (req, res) => {
  try {
    const { methodId } = req.body;
    
    if (!methodId) {
      return res.status(400).json({
        success: false,
        error: 'Payment method ID is required'
      });
    }
    
    // Find user in database
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if the payment method exists in the user's payment methods
    if (!user.paymentMethods || user.paymentMethods.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No payment methods found'
      });
    }
    
    // Reset all payment methods isDefault flag
    user.paymentMethods.forEach(method => {
      method.isDefault = false;
    });
    
    // Find and mark the selected method as default
    const paymentMethod = user.paymentMethods.find(method => method.id === methodId);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    // Set as default payment method
    paymentMethod.isDefault = true;
    
    // Verify it's set in the database object
    console.log('Setting default payment method:', {
      id: paymentMethod.id,
      isDefault: paymentMethod.isDefault,
      paymentMethodInDb: user.paymentMethods.find(m => m.id === methodId)?.isDefault
    });
    
    user.paymentMethod = paymentMethod;
    user.defaultPaymentMethodId = methodId; // Store ID separately for consistent reference
    
    // Save to database
    await user.save();
    
    // Update user object in request for subsequent middleware
    req.user = user;
    
    res.json({
      success: true,
      message: 'Default payment method updated successfully',
      paymentMethod,
      isDefault: true
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set default payment method'
    });
  }
});

/**
 * @route   POST /api/payments/methods/sync
 * @desc    Synchronize payment methods with Stripe and clean up invalid ones
 * @access  Private
 */
router.post('/methods/sync', protect, async (req, res) => {
  try {
    // Find user in database
    const user = await aiUser.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // If user doesn't have a Stripe customer ID, they don't have payment methods
    if (!user.stripeCustomerId) {
      return res.json({
        success: true,
        message: 'No Stripe customer ID found for this user',
        methods: []
      });
    }
    
    // Get all payment methods from Stripe
    const stripePaymentMethods = await stripe.customers.listPaymentMethods(
      user.stripeCustomerId,
      { type: 'card' }
    );
    
    const validMethodIds = stripePaymentMethods.data.map(pm => pm.id);
    
    // Filter out invalid payment methods
    const initialLength = user.paymentMethods ? user.paymentMethods.length : 0;
    const validPaymentMethods = user.paymentMethods 
      ? user.paymentMethods.filter(pm => validMethodIds.includes(pm.id))
      : [];
    
    // Update user's payment methods
    user.paymentMethods = validPaymentMethods;
    
    // If the default payment method is invalid, update it
    if (user.paymentMethod && !validMethodIds.includes(user.paymentMethod.id)) {
      // Find methods that have isDefault set to true
      const previousDefaults = validPaymentMethods.filter(m => m.isDefault);
      
      // Reset all payment methods to not be default
      validPaymentMethods.forEach(method => {
        method.isDefault = false;
      });
      
      // Set a new default
      if (validPaymentMethods.length > 0) {
        const newDefault = validPaymentMethods[0];
        newDefault.isDefault = true;
        user.paymentMethod = newDefault;
        user.defaultPaymentMethodId = newDefault.id;
      } else {
        user.paymentMethod = null;
        user.defaultPaymentMethodId = null;
      }
    }
    
    // Save to database
    await user.save();
    
    // Return updated payment methods
    res.json({
      success: true,
      message: `Payment methods synchronized. ${initialLength - validPaymentMethods.length} invalid methods removed.`,
      methods: validPaymentMethods
    });
  } catch (error) {
    console.error('Sync payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synchronize payment methods'
    });
  }
});

module.exports = router; 