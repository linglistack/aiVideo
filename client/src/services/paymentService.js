import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Add a payment method
export const savePaymentMethod = async (paymentData, token) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.post(
      `${API_URL}/payments/methods`,
      paymentData,
      config
    );

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

// Get payment methods
export async function getPaymentMethods(token) {
  try {
    const response = await axios.get(`${API_URL}/payments/methods`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Return the response data directly without localStorage operations
    return response.data;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Unable to fetch payment methods'
    };
  }
}

// Delete payment method
export const deletePaymentMethod = async (methodId, token) => {
  try {
    // Ensure methodId is a string
    const id = typeof methodId === 'object' ? methodId.id : methodId;
    
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.delete(
      `${API_URL}/payments/methods/${id}`,
      config
    );

    return response.data;
  } catch (error) {
    throw error.response && error.response.data.message
      ? error.response.data.message
      : error.message;
  }
};

// Get payment history
export const getPaymentHistory = async (token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.get(
      `${API_URL}/payments/history`,
      config
    );

    return response.data;
  } catch (error) {
    throw error.response && error.response.data.message
      ? error.response.data.message
      : error.message;
  }
};

// Set default payment method
export const setDefaultPaymentMethod = async (methodId, token) => {
  try {
    // Ensure methodId is a string
    const id = typeof methodId === 'object' ? methodId.id : methodId;
    
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.put(
      `${API_URL}/payments/methods/default`,
      { methodId: id },
      config
    );

    return response.data;
  } catch (error) {
    throw error.response && error.response.data.message
      ? error.response.data.message
      : error.message;
  }
}; 