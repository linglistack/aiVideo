import axios from 'axios';
import { getCurrentUser } from './authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/subscriptions';

// Get auth header
const getAuthHeader = () => {
  const user = getCurrentUser();
  
  if (!user) {
    console.warn('getAuthHeader: No user found in localStorage');
    return { headers: {} };
  }
  
  if (!user.token) {
    console.warn('getAuthHeader: User found but no token available');
    return { headers: {} };
  }
  
  // Validate token format (basic check)
  if (typeof user.token !== 'string' || user.token.trim() === '') {
    console.warn('getAuthHeader: Token is empty or invalid format');
    return { headers: {} };
  }
  
  // Log token length and first/last few characters for debugging
  const tokenLength = user.token.length;
  const tokenPreview = user.token.substring(0, 10) + '...' + user.token.substring(tokenLength - 5);
  console.log(`getAuthHeader: Using token (${tokenLength} chars): ${tokenPreview}`);
  
  return {
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  };
};

// Get all subscription plans
const getPlans = async () => {
  try {
    const response = await axios.get(`${API_URL}/plans`);
    return response.data;
  } catch (error) {
    console.error('Error getting plans:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Get user's subscription status
const getSubscriptionStatus = async () => {
  try {
    const authHeader = getAuthHeader();
    console.log('Requesting subscription status with headers:', authHeader);
    
    const response = await axios.get(`${API_URL}/status`, authHeader);
    return response.data;
  } catch (error) {
    console.error('Error getting subscription status:', error.response?.data || error.message);
    
    // If we get 401 unauthorized, return a default starter plan
    if (error.response?.status === 401) {
      console.log('Providing default starter plan due to auth error');
      return {
        success: true,
        subscription: {
          plan: 'starter',
          isActive: true,
          videosUsed: 0,
          videosLimit: 10,
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          planDetails: {
            name: 'Starter',
            monthlyPrice: 19,
            yearlyPrice: 190
          }
        }
      };
    }
    
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Create checkout session
const createCheckoutSession = async (data) => {
  try {
    const auth = getAuthHeader();
    
    // Check if we have a valid auth header
    if (!auth.headers.Authorization) {
      console.error('createCheckoutSession: No authorization header available');
      return {
        success: false,
        error: 'Authentication required. Please log in and try again.'
      };
    }
    
    // Make sure we have a priceId
    if (!data.priceId) {
      console.error('createCheckoutSession: Missing priceId');
      return {
        success: false,
        error: 'Missing plan information. Please try again.'
      };
    }
    
    // Set default billing cycle if not provided
    if (!data.billingCycle) {
      data.billingCycle = 'monthly';
    }
    
    console.log('createCheckoutSession: Sending request with data:', {
      priceId: data.priceId,
      billingCycle: data.billingCycle
    });
    
    const response = await axios.post(`${API_URL}/create-checkout-session`, data, auth);
    console.log('createCheckoutSession: Response received:', response.data);
    
    // Ensure we return the URL in the response for redirection
    if (response.data.success && response.data.url) {
      return {
        success: true,
        url: response.data.url
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    if (error.response?.status === 401) {
      console.error('Unauthorized error. Token may be invalid or expired.');
      // Clear user session on auth error
      localStorage.removeItem('user');
      return {
        success: false,
        error: 'Your session has expired. Please log in again.',
        redirect: '/login?return_to=/pricing'
      };
    }
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to create checkout session'
    };
  }
};

// Create payment intent for custom form
const createPaymentIntent = async (data) => {
  try {
    const user = getCurrentUser();
    
    // Check if we have a valid token before even trying
    if (!user || !user.token) {
      console.error('Payment failed: No valid authentication token found');
      return { 
        success: false, 
        error: 'Not authorized, no token. Please log in again.' 
      };
    }
    
    // Get auth header after confirming user exists
    const authHeader = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
    
    // Log request details for debugging (without sensitive data)
    console.log('Payment request data:', {
      priceId: data.priceId,
      billingCycle: data.billingCycle,
      paymentMethod: data.paymentMethodId ? 'PRESENT' : 'MISSING'
    });
    
    // Make the API request with the auth header
    const response = await axios.post(
      `${API_URL}/create-payment-intent`, 
      data, 
      authHeader
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    // Special handling for authentication errors
    if (error.response?.status === 401 || 
        (error.response?.data?.error && error.response?.data?.error.includes('Not authorized'))) {
      console.error('Authentication error during payment');
      return {
        success: false,
        error: 'Authentication error. Please try logging out and back in, then try again.'
      };
    }
    
    // Return a proper error response rather than throwing
    return { 
      success: false, 
      error: error.response?.data?.error || error.message || 'Failed to process payment'
    };
  }
};

// Cancel subscription
const cancelSubscription = async (data = {}) => {
  try {
    const user = getCurrentUser();
    
    if (!user || !user.token) {
      console.error('cancelSubscription: No valid user token found');
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }
    
    console.log('Sending cancel subscription request with auth token');
    const response = await axios.delete(`${API_URL}/cancel`, {
      ...getAuthHeader(),
      data: data // Send data in the request body for DELETE
    });
    
    // If successful, update the local user data to reflect cancellation
    if (response.data.success) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser && currentUser.subscription) {
          currentUser.subscription.isActive = false;
          currentUser.subscription.canceledAt = new Date().toISOString();
          currentUser.subscription.status = 'canceled';
          currentUser.subscription.cancelAtPeriodEnd = true;
          currentUser.subscription.isCanceled = true;
          
          localStorage.setItem('user', JSON.stringify(currentUser));
          console.log('Updated local user data with subscription cancellation');
        }
      } catch (localStorageError) {
        console.error('Error updating local storage after cancellation:', localStorageError);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    
    // Handle 401 unauthorized errors
    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Your session has expired. Please log in again.'
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to cancel subscription'
    };
  }
};

// Refresh subscription data after changes
const refreshSubscriptionData = async () => {
  try {
    const user = getCurrentUser();
    
    if (!user || !user.token) {
      console.error('refreshSubscriptionData: No valid user token found');
      return {
        success: false,
        error: 'Authentication required. Please log in again.'
      };
    }
    
    // Get fresh subscription data
    const response = await getSubscriptionStatus();
    
    // Update local storage with new subscription data
    if (response.success && response.subscription) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser) {
          currentUser.subscription = response.subscription;
          localStorage.setItem('user', JSON.stringify(currentUser));
          console.log('Updated local user data with refreshed subscription');
        }
      } catch (localStorageError) {
        console.error('Error updating local storage with refreshed subscription:', localStorageError);
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error refreshing subscription data:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to refresh subscription data'
    };
  }
};

// Verify session (after checkout)
const verifySession = async (sessionId) => {
  try {
    const response = await axios.get(
      `${API_URL}/verify-session?session_id=${sessionId}`,
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error('Error verifying session:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Create billing portal session
const createBillingPortalSession = async (returnUrl) => {
  try {
    const user = getCurrentUser();
    
    if (!user || !user.token) {
      console.warn('createBillingPortalSession: No valid user session found');
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    console.log('Creating billing portal session for user');
    const response = await axios.post(
      `${API_URL}/create-billing-portal`,
      { returnUrl },
      getAuthHeader()
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating billing portal session:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Get subscription usage statistics
const getSubscriptionUsage = async () => {
  try {
    // Get fresh user data to ensure we have the latest token
    const user = getCurrentUser();
    
    if (!user || !user.token) {
      console.log('getSubscriptionUsage: No authenticated user found, returning default data');
      return {
        success: true,
        usage: {
          videosUsed: 0,
          videosLimit: 10,
          videosRemaining: 10,
          plan: 'free',
          isActive: false,
          endDate: null,
          daysUntilReset: 30,
          billingCycle: 'none'
        }
      };
    }
    
    const authHeader = {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    };
    
    console.log('Requesting subscription usage with token');
    const response = await axios.get(`${API_URL}/usage`, authHeader);
    return response.data;
  } catch (error) {
    console.error('Error getting subscription usage:', error.response?.data || error.message);
    
    // If we get 401 unauthorized, return a default object
    if (error.response?.status === 401) {
      console.log('Providing default usage data due to auth error');
      return {
        success: true,
        usage: {
          videosUsed: 0,
          videosLimit: 10,
          videosRemaining: 10,
          plan: 'free',
          isActive: false,
          endDate: null,
          daysUntilReset: 30,
          billingCycle: 'none'
        }
      };
    }
    
    throw error.response?.data || { success: false, error: error.message };
  }
};

export {
  getPlans,
  getSubscriptionStatus,
  createCheckoutSession,
  createPaymentIntent,
  cancelSubscription,
  verifySession,
  createBillingPortalSession,
  getSubscriptionUsage,
  refreshSubscriptionData
}; 