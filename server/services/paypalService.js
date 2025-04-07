const axios = require('axios');

// PayPal API URLs
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal access token
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured');
    }
    
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/v1/oauth2/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      },
      data: 'grant_type=client_credentials'
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error);
    throw error;
  }
}

/**
 * Create a subscription plan in PayPal
 * @param {Object} planData Plan data
 * @returns {Promise<Object>} Created plan
 */
async function createPlan(planData) {
  try {
    const accessToken = await getAccessToken();
    
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/v1/billing/plans`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: planData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating PayPal plan:', error);
    throw error;
  }
}

/**
 * Create a subscription in PayPal
 * @param {Object} subscriptionData Subscription data
 * @returns {Promise<Object>} Created subscription
 */
async function createSubscription(subscriptionData) {
  try {
    const accessToken = await getAccessToken();
    
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/v1/billing/subscriptions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: subscriptionData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating PayPal subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription in PayPal
 * @param {string} subscriptionId Subscription ID
 * @param {string} reason Cancellation reason
 * @returns {Promise<Object>} Result
 */
async function cancelSubscription(subscriptionId, reason = 'Cancelled by user') {
  try {
    const accessToken = await getAccessToken();
    
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: {
        reason
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error cancelling PayPal subscription:', error);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

/**
 * Get subscription details
 * @param {string} subscriptionId Subscription ID
 * @returns {Promise<Object>} Subscription details
 */
async function getSubscription(subscriptionId) {
  try {
    const accessToken = await getAccessToken();
    
    const response = await axios({
      method: 'get',
      url: `${BASE_URL}/v1/billing/subscriptions/${subscriptionId}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting PayPal subscription:', error);
    throw error;
  }
}

module.exports = {
  getAccessToken,
  createPlan,
  createSubscription,
  cancelSubscription,
  getSubscription
};
