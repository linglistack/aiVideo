/**
 * Mock Data Service
 * 
 * This service provides mock data for development purposes.
 * In production, real database calls should be used instead.
 */

// Mock payment methods
const mockPaymentMethods = [
  {
    id: 'pm_mock_123456789',
    type: 'card',
    brand: 'visa',
    last4: '4242',
    expMonth: '12',
    expYear: '2030',
    nameOnCard: 'John Doe',
    createdAt: new Date()
  }
];

// Mock payment history
const mockPaymentHistory = [
  {
    id: 'pi_mock_123456789',
    invoiceId: 'in_mock_123456789',
    date: new Date().toISOString(),
    amount: 19.99,
    plan: 'Starter',
    billingCycle: 'monthly',
    status: 'succeeded',
    receiptUrl: 'https://example.com/receipt',
    receiptNumber: 'MOCK123456'
  }
];

/**
 * Get mock data for development
 * @param {string} type - The type of mock data to get
 * @returns {Array} Array of mock data objects
 */
const getMockData = (type) => {
  switch(type) {
    case 'paymentMethods':
      return [...mockPaymentMethods];
    case 'paymentHistory':
      return [...mockPaymentHistory];
    default:
      return [];
  }
};

module.exports = {
  getMockData
}; 