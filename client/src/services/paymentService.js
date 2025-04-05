import API from './api';

// Add a payment method
export const savePaymentMethod = async (paymentData) => {
  try {
    const response = await API.post('/payments/methods', paymentData);

    // If successful, also save to localStorage to ensure persistence
    if (response.data.success && response.data.paymentMethod) {
      try {
        const userString = localStorage.getItem('user');
        if (userString) {
          const userData = JSON.parse(userString);
          userData.paymentMethod = response.data.paymentMethod;
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('Payment method saved to localStorage');
        }
      } catch (err) {
        console.error('Error saving payment method to localStorage:', err);
      }
    }

    return response.data;
  } catch (error) {
    console.error('Payment method save error:', error.response?.data || error.message);
    throw error.response?.data?.error || 
          error.response?.data?.message ||
          error.message || 
          'Failed to save payment method';
  }
};

// Get all payment methods
export const getPaymentMethods = async () => {
  try {
    const response = await API.get('/payments/methods');
    return response.data;
  } catch (error) {
    console.error('Get payment methods error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Delete payment method
export const deletePaymentMethod = async (methodId) => {
  try {
    // Ensure methodId is a string
    const id = typeof methodId === 'object' ? methodId.id : methodId;
    
    const response = await API.delete(`/payments/methods/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete payment method error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Get payment history
export const getPaymentHistory = async () => {
  try {
    const response = await API.get('/payments/history');
    return response.data;
  } catch (error) {
    console.error('Get payment history error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Set default payment method
export const setDefaultPaymentMethod = async (methodId) => {
  try {
    // Ensure methodId is a string
    const id = typeof methodId === 'object' ? methodId.id : methodId;
    
    const response = await API.put('/payments/methods/default', { methodId: id });
    return response.data;
  } catch (error) {
    console.error('Set default payment method error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
}; 