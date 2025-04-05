import API from './api';

// Create a helper function to get auth header
const authHeader = () => {
  const token = localStorage.getItem('userToken');
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
};

// Generate a video
export const generateVideo = async (videoData) => {
  try {
    const response = await API.post('/videos/generate', videoData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get user's videos
export const getUserVideos = async () => {
  try {
    const response = await API.get('/videos');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get a specific video by ID
export const getVideoById = async (videoId) => {
  try {
    const response = await API.get(`/videos/${videoId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get video status
export const getVideoStatus = async (videoId) => {
  try {
    const response = await API.get(`/videos/status/${videoId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}; 