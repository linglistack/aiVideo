/**
 * API Configuration
 * 
 * This file provides configuration for API calls and automatically switches
 * between development and production environments.
 */

// Define API base URLs from environment variables or defaults
const API_URLS = {
  dev: process.env.REACT_APP_API_URL_DEV || 'http://localhost:5000/api',
  prod: process.env.REACT_APP_API_URL_PROD || 'https://ai-video-server.vercel.app/api'
};

// Determine if we're in production by checking the hostname
const isProduction = () => {
  // Window check for SSR compatibility
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Check if we're on a production domain (not localhost)
    return !['localhost', '127.0.0.1', ''].includes(hostname);
  }
  return process.env.NODE_ENV === 'production';
};

// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // Check for environment variable override first
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Otherwise use environment detection
  return isProduction() ? API_URLS.prod : API_URLS.dev;
};

// Get specific API endpoint URL
const getApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/${endpoint}`;
};

// Export the configuration
export default {
  apiBaseUrl: getApiBaseUrl(),
  auth: getApiUrl('auth'),
  videos: getApiUrl('videos'),
  subscriptions: getApiUrl('subscriptions'),
  payments: getApiUrl('payments'),
  contact: getApiUrl('contact'),
  isProduction: isProduction()
}; 