import axios from 'axios';

// Determine the API base URL based on environment
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // For production build
    return process.env.REACT_APP_API_URL_PRODUCTION || 'https://ai-video-server.vercel.app/api';
  }
  
  // For local development
  return process.env.REACT_APP_API_URL_DEVELOPMENT || 'http://localhost:5000/api';
};

// Create an Axios instance with the base URL
const API = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API URL in development for debugging
if (process.env.NODE_ENV !== 'production') {
  console.log('API URL:', getBaseUrl());
}

// Add a request interceptor to attach authentication token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken') || 
                 (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null);
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log errors in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error.response?.data || error.message);
    }
    
    // Handle token expiration
    if (error.response && error.response.status === 401) {
      // Consider redirecting to login page
      localStorage.removeItem('user');
      localStorage.removeItem('userToken');
      // Optional: window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default API;

// Helper function to get auth header config for non-interceptor use
export const getAuthConfig = () => {
  const token = localStorage.getItem('userToken') || 
               (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).token : null);
  
  return {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    }
  };
}; 