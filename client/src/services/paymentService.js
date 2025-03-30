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

    // If we successfully fetched payment methods
    if (response.data.success && response.data.methods && response.data.methods.length > 0) {
      // Try to update the user object in localStorage with the latest payment method
      try {
        const userString = localStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          if (user) {
            // Attach the first payment method to the user object (assuming primary payment method)
            user.paymentMethod = response.data.methods[0];
            localStorage.setItem('user', JSON.stringify(user));
            console.log('Updated user localStorage with payment method');
          }
        }
      } catch (err) {
        console.error('Error updating localStorage with payment method:', err);
        // Continue anyway as this is just an enhancement
      }
    }

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
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const response = await axios.delete(
      `${API_URL}/payments/methods/${methodId}`,
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