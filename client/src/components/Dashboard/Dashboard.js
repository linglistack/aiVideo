import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserVideos } from '../../services/videoService';
import { refreshToken } from '../../services/authService';
import { getSubscriptionStatus } from '../../services/subscriptionService';

// Helper function to format date
const formatDate = (dateString) => {
  const options = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Helper function to calculate days remaining until date
const calculateDaysRemaining = (endDateString) => {
  if (!endDateString) return null;
  
  const endDate = new Date(endDateString);
  const today = new Date();
  
  // Reset hours to compare just the dates
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

const Dashboard = ({ user, subscriptionUsage, loadingUsage }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [error, setError] = useState('');
  const [localSubscription, setLocalSubscription] = useState(null);

  // Fetch user subscription data directly (don't rely on passed props)
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      setLoadingSubscription(true);
      try {
        // First refresh the token
        const refreshResult = await refreshToken();
        if (!refreshResult.success) {
          console.warn('Token refresh failed, using fallback subscription data');
          return;
        }
        
        // Then get subscription status
        const result = await getSubscriptionStatus();
        if (result.success) {
          console.log('Fetched subscription data for dashboard:', result.subscription);
          setLocalSubscription(result.subscription);
        } else {
          console.warn('Failed to fetch subscription status:', result.error);
        }
      } catch (err) {
        console.error('Error fetching subscription data:', err);
      } finally {
        setLoadingSubscription(false);
      }
    };
    
    fetchSubscriptionData();
  }, []);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await getUserVideos();
        setVideos(response.videos);
        setError('');
      } catch (err) {
        setError('Failed to load videos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // First try localSubscription (direct API data), then subscriptionUsage (props),
  // then user?.subscription (from localStorage via props), then fallback defaults
  const subscription = localSubscription || subscriptionUsage || user?.subscription || {
    videosUsed: 0,
    videosLimit: 10,
    plan: 'free',
    endDate: null
  };
  
  // Use the videosRemaining from the most reliable source
  const videosRemaining = localSubscription 
    ? (localSubscription.videosLimit - localSubscription.videosUsed)
    : subscriptionUsage 
      ? subscriptionUsage.videosRemaining 
      : Math.max(0, subscription.videosLimit - subscription.videosUsed);
  
  // Use the daysUntilReset from the most reliable source
  const daysRemaining = localSubscription
    ? calculateDaysRemaining(localSubscription.endDate)
    : subscriptionUsage 
      ? subscriptionUsage.daysUntilReset 
      : calculateDaysRemaining(subscription.endDate);

  const isLoadingSubscriptionData = loadingUsage || loadingSubscription;

  return (
    <div className="pt-0 min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Dashboard</h1>
          <Link 
            to="/create" 
            className="mt-4 md:mt-0 bg-tiktok-pink text-white py-3 px-6 rounded-full font-medium flex items-center justify-center hover:bg-opacity-90 transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Video
          </Link>
        </div>

        {/* Subscription Stats */}
        <div className="bg-tiktok-dark rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Subscription Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoadingSubscriptionData ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-black bg-opacity-30 rounded-xl p-4 animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-2/3 mb-4"></div>
                    <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-2 bg-gray-700 rounded w-full mb-3"></div>
                    <div className="h-3 bg-gray-700 rounded w-3/4"></div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="bg-black bg-opacity-30 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">Monthly Videos</p>
                  <div className="flex items-center justify-center mt-2">
                    <span className="text-3xl font-bold mr-2">
                      {subscription.videosUsed || 0}
                    </span>
                    <span className="text-gray-400">/ {subscription.videosLimit || 0}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink h-2 rounded-full" 
                      style={{ width: `${subscription.videosLimit ? (subscription.videosUsed / subscription.videosLimit) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    <span className="text-tiktok-pink font-semibold">{videosRemaining}</span> videos remaining this month
                  </p>
                </div>
                
                <div className="bg-black bg-opacity-30 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">Current Plan</p>
                  <p className="text-3xl font-bold mt-2">
                    {subscription.plan ? 
                      ((subscription.plan.toLowerCase() === 'free' || subscription.plan.toLowerCase() === 'starter') ? 
                        subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : 
                        subscription.plan) 
                      : 'Free'}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    {subscription.planDetails?.monthlyPrice ? `$${subscription.planDetails.monthlyPrice}/month` :
                     subscription.plan === 'starter' ? '$19/month' : 
                     subscription.plan === 'growth' ? '$49/month' : 
                     subscription.plan === 'scale' ? '$95/month' : 'Free'}
                  </p>
                </div>
                
                <div className="bg-black bg-opacity-30 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">Renewal Date</p>
                  <p className="text-3xl font-bold mt-2">
                    {subscription.endDate ? formatDate(subscription.endDate) : 'N/A'}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    {daysRemaining !== null ? 
                      `Resets in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` : 
                      'auto-renews'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Recent Videos */}
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Videos</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-tiktok-dark bg-opacity-50 rounded-2xl p-10 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No videos yet</h3>
              <p className="text-gray-400 mb-6">You haven't created any videos yet. Click "Create New Video" to get started!</p>
              <Link 
                to="/create"
                className="bg-tiktok-pink text-white py-3 px-6 rounded-full font-medium inline-flex items-center hover:bg-opacity-90 transition duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create Your First Video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div key={video.id} className="bg-tiktok-dark rounded-2xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl relative group">
                  {/* Video Thumbnail */}
                  <div className="relative aspect-[9/16] bg-black">
                    <img 
                      src={video.thumbnailUrl || 'https://via.placeholder.com/300x500'} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Link to={`/videos/${video.id}`} className="h-16 w-16 rounded-full bg-tiktok-pink/80 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </div>
                    
                    {/* Video Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="bg-tiktok-pink text-white text-xs px-2 py-0.5 rounded-full">
                          {video.status}
                        </span>
                        <span className="text-gray-300 text-xs">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Link to={`/videos/${video.id}`} className="text-white hover:text-tiktok-pink">
                        <h3 className="font-bold truncate">{video.title}</h3>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Video Controls */}
                  <div className="p-4 flex justify-between items-center">
                    <h3 className="font-medium truncate">{video.title}</h3>
                    <div className="flex space-x-2">
                      <button className="text-gray-400 hover:text-tiktok-pink">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                        </svg>
                      </button>
                      <button className="text-gray-400 hover:text-tiktok-pink">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Analytics Overview */}
        {videos.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold mb-4">Analytics Overview</h2>
            <div className="bg-tiktok-dark rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Total Views</h3>
                    <span className="text-tiktok-pink">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {Math.floor(Math.random() * 10000)}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    <span>+12.5% from last week</span>
                  </div>
                </div>
                
                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Likes</h3>
                    <span className="text-tiktok-pink">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {Math.floor(Math.random() * 1000)}
                  </p>
                  <div className="flex items-center mt-2 text-xs text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    <span>+8.3% from last week</span>
                  </div>
                </div>
                
                <div className="bg-black bg-opacity-30 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Engagement Rate</h3>
                    <span className="text-tiktok-pink">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-2xl font-bold">
                    {(Math.random() * 10).toFixed(2)}%
                  </p>
                  <div className="flex items-center mt-2 text-xs text-green-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    <span>+3.7% from last week</span>
                  </div>
                </div>
              </div>
              
              {/* Chart Placeholder */}
              <div className="mt-6 bg-black bg-opacity-30 rounded-xl p-4 h-64 flex items-center justify-center">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  <p className="text-gray-400">
                    Detailed analytics and charts will appear here as your videos gain traction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/create" className="bg-tiktok-dark rounded-xl p-4 text-center hover:bg-opacity-80 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-tiktok-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="font-medium">Create Video</p>
            </Link>
            
            <Link to="/account" className="bg-tiktok-dark rounded-xl p-4 text-center hover:bg-opacity-80 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-tiktok-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="font-medium">Account Settings</p>
            </Link>
            
            <Link to="/analytics" className="bg-tiktok-dark rounded-xl p-4 text-center hover:bg-opacity-80 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-tiktok-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="font-medium">View Analytics</p>
            </Link>
            
            <Link to="/account/subscription" className="bg-tiktok-dark rounded-xl p-4 text-center hover:bg-opacity-80 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-tiktok-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="font-medium">Manage Subscription</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;