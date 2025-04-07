import axios from 'axios';
import config from './config';

const API_URL = config.apiBaseUrl;

// Add a payment method
export const savePaymentMethod = async (paymentData, token) => {
  try {
    console.log('Saving payment method:', paymentData);
    
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

    // Just return the response data - no localStorage updates
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