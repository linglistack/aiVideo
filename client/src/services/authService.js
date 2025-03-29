import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

// Register user
const register = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/register`, userData);
    
    if (response.data.success) {
      // Save user to localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Login user
const login = async (emailOrFormData, maybePassword = null) => {
  try {
    let email, password;
    
    // Check if the first parameter is an object (form data)
    if (typeof emailOrFormData === 'object' && emailOrFormData !== null) {
      // Extract email and password from the form data object
      email = emailOrFormData.email;
      password = emailOrFormData.password;
      console.log("Extracted from form data:", { email, password: password ? "Yes" : "No" });
    } else {
      // First parameter is already the email, second is the password
      email = emailOrFormData;
      password = maybePassword;
    }
    
    console.log("Sending login request with:", { email, password: password ? "Yes" : "No" });
    const response = await axios.post(`${API_URL}/login`, { email, password });
    
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Google login
const googleLogin = async (tokenId) => {
  try {
    const response = await axios.post(`${API_URL}/google`, { tokenId });
    
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Google login error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Track the last time getProfile was called
let lastProfileCall = 0;
const THROTTLE_MS = 1000; // Only allow one call per second

// Get user profile
const getProfile = async () => {
  try {
    // Throttle to prevent too many calls in quick succession 
    const now = Date.now();
    if (now - lastProfileCall < THROTTLE_MS) {
      return {
        success: false,
        error: 'Too many profile requests. Please try again shortly.',
        throttled: true
      };
    }
    
    lastProfileCall = now;
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
      console.error('Get profile error: No user found in localStorage');
      return {
        success: false,
        error: 'Not logged in'
      };
    }
    
    if (!user.token) {
      console.error('Get profile error: No token found for user');
      return {
        success: false,
        error: 'Authentication token missing'
      };
    }
    
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };
    
    // Only log this in development env
    if (process.env.NODE_ENV === 'development') {
      console.log('Requesting user profile with token', { userId: user._id });
    }
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await axios.get(`${API_URL}/profile`, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If we get a new token, add it to the response
      if (response.data.success && !response.data.token) {
        response.data.token = user.token; // Provide existing token if no new one
      }
      
      return response.data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get profile error:', error.response?.data || error.message);
    }
    
    // Handle abort errors
    if (error.name === 'AbortError') {
      console.error('Profile request timed out');
      return {
        success: false,
        error: 'Request timed out. Please try again.'
      };
    }
    
    // Provide more specific error messages
    if (error.response) {
      if (error.response.status === 401) {
        return {
          success: false,
          error: 'Your session has expired. Please log in again.'
        };
      } else if (error.response.status === 404) {
        return {
          success: false,
          error: 'User profile not found. Please try logging out and back in.'
        };
      } else if (error.response.status >= 500) {
        return {
          success: false,
          error: 'Server error. Please try again later.'
        };
      }
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to load profile. Please try again.'
    };
  }
};

// Logout user
const logout = (redirectUrl = '/') => {
  console.log('Starting logout process');
  
  // First clear all localStorage items
  localStorage.clear();
  
  // Then clear sessionStorage items
  sessionStorage.clear();
  
  // Clear all cookies by setting their expiration to past date
  document.cookie.split(";").forEach((c) => {
    const name = c.split('=')[0].trim();
    // Set multiple variations to ensure all cookies are cleared
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
  });
  
  // For HTTP-only cookies, make a server call
  try {
    // Use synchronous XHR to ensure the request completes before page transition
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/logout`, false); // false makes it synchronous
    xhr.withCredentials = true; // Include cookies
    xhr.send();
    console.log('Server logout complete');
  } catch (error) {
    console.error('Error during server logout:', error);
  }
  
  console.log('User logged out successfully - all session data cleared');
  
  // Dispatch a custom event that components can listen for
  window.dispatchEvent(new Event('user-logout'));
  
  // Skip navigation if redirectUrl is null (caller will handle navigation)
  if (redirectUrl === null) {
    console.log('Skipping navigation - caller will handle redirect');
    return;
  }
  
  // If we're already being redirected to login due to route protection, just stay there
  // This prevents the double redirect
  if (window.location.pathname.includes('/login')) {
    console.log('Already on login page, not redirecting to:', redirectUrl);
    // If we have a return_to parameter, keep it
    return;
  }
  
  // Give UI a moment to update before navigation
  setTimeout(() => {
    console.log('Redirecting to:', redirectUrl);
    window.location.href = redirectUrl;
  }, 200);
};

// Get current user from localStorage
const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};

// Decode JWT to check expiration
const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Refresh token and get updated user data
const refreshToken = async () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || !user.token) {
      console.error('Cannot refresh token: No user or token found');
      return {
        success: false,
        error: 'No authentication token found'
      };
    }
    
    // Call the profile endpoint which will validate the token
    const response = await axios.get(`${API_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${user.token}`
      }
    });
    
    if (response.data.success) {
      // Create updated user object with the current token if no new one provided
      const updatedUser = {
        ...user,
        ...response.data.user,
        token: response.data.token || user.token
      };
      
      // Update in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return {
        success: true,
        user: updatedUser
      };
    }
    
    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.response?.status === 401) {
      // Token is invalid or expired
      return {
        success: false,
        error: 'Your session has expired. Please log in again.',
        expired: true
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to refresh authentication'
    };
  }
};

// Create the service object
const authService = {
  register,
  login,
  logout,
  googleLogin,
  getProfile,
  getCurrentUser,
  decodeJWT,
  refreshToken
};

// Export both named functions and default object
export {
  register,
  login,
  logout,
  googleLogin,
  getProfile,
  getCurrentUser,
  decodeJWT,
  refreshToken
};

export default authService; 