const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const aiUser = require('../models/aiUser');
const Payment = require('../models/Payment');

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
    const { id, type, brand, last4, expMonth, expYear, nameOnCard } = req.body;
    
    // Basic validation
    if (!type || !brand || !last4) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment method information'
      });
    }
    
    // Validate payment method ID - it must be a real Stripe payment method ID
    if (!id || !id.startsWith('pm_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method ID format. Must be a valid Stripe payment method ID.'
      });
    }
    
    // Format the payment method for storage
    const paymentMethod = {
      id, // Must be a valid Stripe payment method ID (starts with pm_)
      type,
      brand,
      last4,
      expMonth,
      expYear,
      nameOnCard: nameOnCard || req.user.name,
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
    
    // Check if this payment method already exists
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
    
    // Set as default payment method
    user.paymentMethod = paymentMethod;
    
    // Save to database
    await user.save();
    
    // Update user object in request for subsequent middleware
    req.user = user;
    
    res.status(201).json({
      success: true,
      paymentMethod: paymentMethod
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
    
    res.json({
      success: true,
      methods: userPaymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment methods'
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
    
    const paymentMethod = user.paymentMethods.find(method => method.id === methodId);
    
    if (!paymentMethod) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    // Set as default payment method
    user.paymentMethod = paymentMethod;
    
    // Save to database
    await user.save();
    
    // Update user object in request for subsequent middleware
    req.user = user;
    
    res.json({
      success: true,
      message: 'Default payment method updated successfully',
      paymentMethod
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
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
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
      user.paymentMethod = validPaymentMethods.length > 0 ? validPaymentMethods[0] : null;
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