const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Mock database for payment methods (in a real app, this would be in your database)
let paymentMethods = {};
let paymentHistory = {};

/**
 * @route   POST /api/payments/methods
 * @desc    Save a payment method
 * @access  Private
 */
router.post('/methods', protect, (req, res) => {
  try {
    const { cardNumber, expiryMonth, expiryYear, cvc, nameOnCard } = req.body;
    
    // Validate inputs
    if (!cardNumber || !expiryMonth || !expiryYear || !cvc || !nameOnCard) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required payment information'
      });
    }
    
    // In a real implementation, you would:
    // 1. Create a payment method with Stripe
    // 2. Save the payment method ID in your database
    
    // For this mock implementation:
    const last4 = cardNumber.slice(-4);
    const brand = getBrandFromCardNumber(cardNumber);
    const paymentMethodId = `pm_${Date.now()}`;
    
    const paymentMethod = {
      id: paymentMethodId,
      last4,
      brand,
      expMonth: expiryMonth,
      expYear: expiryYear,
      nameOnCard,
      createdAt: new Date()
    };
    
    // Store the payment method for this user
    if (!paymentMethods[req.user._id]) {
      paymentMethods[req.user._id] = [];
    }
    
    paymentMethods[req.user._id].push(paymentMethod);
    
    // Update the user's default payment method
    req.user.paymentMethod = paymentMethod;
    
    res.status(201).json({
      success: true,
      paymentMethod
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
router.get('/methods', protect, (req, res) => {
  try {
    const userPaymentMethods = paymentMethods[req.user._id] || [];
    
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
router.delete('/methods/:id', protect, (req, res) => {
  try {
    const { id } = req.params;
    
    if (!paymentMethods[req.user._id]) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    // Find and remove the payment method
    const initialLength = paymentMethods[req.user._id].length;
    paymentMethods[req.user._id] = paymentMethods[req.user._id].filter(
      method => method.id !== id
    );
    
    if (paymentMethods[req.user._id].length === initialLength) {
      return res.status(404).json({
        success: false,
        error: 'Payment method not found'
      });
    }
    
    // If the deleted method was the user's default payment method, clear it
    if (req.user.paymentMethod && req.user.paymentMethod.id === id) {
      req.user.paymentMethod = null;
    }
    
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
router.get('/history', protect, (req, res) => {
  try {
    // In a real app, you would fetch payment history from your database
    const userPaymentHistory = paymentHistory[req.user._id] || [];
    
    // For the demo, if no payment history exists, create a mock entry
    if (userPaymentHistory.length === 0 && process.env.NODE_ENV === 'development') {
      const mockPayment = {
        id: `pi_${Date.now()}`,
        date: new Date().toISOString(),
        amount: 19,
        plan: 'Starter',
        status: 'succeeded'
      };
      
      if (!paymentHistory[req.user._id]) {
        paymentHistory[req.user._id] = [];
      }
      
      paymentHistory[req.user._id].push(mockPayment);
      
      return res.json({
        success: true,
        history: [mockPayment]
      });
    }
    
    res.json({
      success: true,
      history: userPaymentHistory
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

module.exports = router; 