import axios from 'axios';
import config from './config';

const API_URL = config.videos;

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
    const response = await axios.post(
      `${API_URL}/generate`, 
      videoData, 
      authHeader()
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get all user videos
export const getUserVideos = async () => {
  try {
    const response = await axios.get(API_URL, authHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Get video by ID
export const getVideoById = async (videoId) => {
  try {
    const response = await axios.get(`${API_URL}/${videoId}`, authHeader());
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}; 