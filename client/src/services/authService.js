import API from './api';

// Register user
const register = async (userData) => {
  try {
    const response = await API.post('/auth/register', userData);
    
    if (response.data.success) {
      // Save user to localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.token) {
        localStorage.setItem('userToken', response.data.token);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Login user
const login = async (email, password) => {
  try {
    const response = await API.post('/auth/login', { email, password });
    
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.token) {
        localStorage.setItem('userToken', response.data.token);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Logout user
const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('userToken');
  // You could also call an API endpoint to invalidate tokens on the server side
};

// Google login
const googleLogin = async (tokenId) => {
  try {
    const response = await API.post('/auth/google', { tokenId });
    
    if (response.data.success) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
      if (response.data.token) {
        localStorage.setItem('userToken', response.data.token);
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Google login error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Get user profile
const getUserProfile = async () => {
  try {
    const response = await API.get('/auth/profile');
    return response.data;
  } catch (error) {
    console.error('Get profile error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Update user profile
const updateProfile = async (userData) => {
  try {
    const response = await API.put('/auth/profile', userData);
    
    if (response.data.success) {
      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error) {
    console.error('Update profile error:', error.response?.data || error.message);
    throw error.response?.data || { success: false, error: error.message };
  }
};

// Get current user from localStorage
const getCurrentUser = () => {
  const userJSON = localStorage.getItem('user');
  if (userJSON) {
    try {
      return JSON.parse(userJSON);
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
      return null;
    }
  }
  return null;
};

export {
  register,
  login,
  logout,
  googleLogin,
  getUserProfile,
  updateProfile,
  getCurrentUser
}; 