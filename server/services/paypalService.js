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

/**
 * Retry a failed subscription payment
 * @param {string} subscriptionId Subscription ID
 * @returns {Promise<Object>} Result
 */
async function retrySubscriptionPayment(subscriptionId) {
  try {
    const accessToken = await getAccessToken();
    
    // First check the subscription status
    const subscription = await getSubscription(subscriptionId);
    
    // If subscription is not in a state that allows payment retry, return error
    if (subscription.status !== 'APPROVAL_PENDING' && 
        subscription.status !== 'SUSPENDED' && 
        subscription.status !== 'ACTIVE') {
      return {
        success: false,
        error: `Subscription is in ${subscription.status} state, cannot retry payment`
      };
    }
    
    // For PayPal subscriptions, we capture the failed transaction
    // First, let's check the last failed transaction
    const transactionsResponse = await axios({
      method: 'get',
      url: `${BASE_URL}/v1/billing/subscriptions/${subscriptionId}/transactions?start_time=${getDateXDaysAgo(30)}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const transactions = transactionsResponse.data.transactions || [];
    
    // Find the most recent failed transaction
    const failedTransaction = transactions.find(t => 
      (t.status === 'FAILED' || t.status === 'DECLINED') && 
      t.amount_with_breakdown
    );
    
    if (!failedTransaction) {
      return {
        success: false,
        error: 'No failed transaction found to retry'
      };
    }
    
    // For PayPal, we need to make a new billing attempt rather than retry
    // the specific transaction - we can trigger this by calling the capture endpoint
    const response = await axios({
      method: 'post',
      url: `${BASE_URL}/v1/billing/subscriptions/${subscriptionId}/capture`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      data: {
        note: 'Retry of failed payment',
        capture_type: 'OUTSTANDING_BALANCE',
        amount: failedTransaction.amount_with_breakdown
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error retrying PayPal subscription payment:', error);
    
    // Check for specific PayPal error types
    if (error.response) {
      const paypalError = error.response.data;
      return {
        success: false,
        error: paypalError.message || 'PayPal payment retry failed',
        details: paypalError.details || [],
        httpStatus: error.response.status
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to retry PayPal payment'
    };
  }
}

/**
 * Helper function to get a date X days ago in ISO format
 */
function getDateXDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

module.exports = {
  getAccessToken,
  createPlan,
  createSubscription,
  cancelSubscription,
  getSubscription,
  retrySubscriptionPayment
};
