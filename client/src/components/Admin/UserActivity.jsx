import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../services/config';

const UserActivity = ({ authHeader }) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [loading, setLoading] = useState({
    active: true,
    inactive: true
  });
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [inactiveDays, setInactiveDays] = useState(30);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (activeTab === 'active') {
      fetchActiveUsers();
    } else {
      fetchInactiveUsers();
    }
  }, [activeTab, page, inactiveDays]);

  const fetchActiveUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, active: true }));
      setError(null);
      
      const response = await axios.get(
        `${config.apiBaseUrl}/admin/users/activity?page=${page}&limit=15`,
        authHeader()
      );
      
      if (response.data.success) {
        setActiveUsers(response.data.users);
        setTotalPages(response.data.pages);
      } else {
        setError(response.data.error || 'Failed to fetch active users');
      }
    } catch (error) {
      console.error('Error fetching active users:', error);
      setError(error.response?.data?.error || 'An unexpected error occurred');
    } finally {
      setLoading(prev => ({ ...prev, active: false }));
    }
  };

  const fetchInactiveUsers = async () => {
    try {
      setLoading(prev => ({ ...prev, inactive: true }));
      setError(null);
      
      const response = await axios.get(
        `${config.apiBaseUrl}/admin/users/inactive?days=${inactiveDays}`,
        authHeader()
      );
      
      if (response.data.success) {
        setInactiveUsers(response.data.users);
      } else {
        setError(response.data.error || 'Failed to fetch inactive users');
      }
    } catch (error) {
      console.error('Error fetching inactive users:', error);
      setError(error.response?.data?.error || 'An unexpected error occurred');
    } finally {
      setLoading(prev => ({ ...prev, inactive: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    // Create date object from the UTC string
    const date = new Date(dateString);
    
    // Format to Eastern Time
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York'
    }) + ' ET';
  };

  const getTimeSinceLastVisit = (dateString) => {
    if (!dateString) return 'Never visited';
    
    const lastVisit = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - lastVisit);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">User Activity</h2>
        <div className="flex gap-2">
          {activeTab === 'inactive' && (
            <select
              value={inactiveDays}
              onChange={(e) => setInactiveDays(parseInt(e.target.value))}
              className="bg-black border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-tiktok-pink"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          )}
          <button
            onClick={() => activeTab === 'active' ? fetchActiveUsers() : fetchInactiveUsers()}
            className="bg-tiktok-pink text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-800">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-3 px-4 font-medium border-b-2 ${
              activeTab === 'active'
                ? 'border-tiktok-pink text-tiktok-pink'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Active Users
          </button>
          <button
            onClick={() => setActiveTab('inactive')}
            className={`py-3 px-4 font-medium border-b-2 ${
              activeTab === 'inactive'
                ? 'border-tiktok-pink text-tiktok-pink'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Inactive Users
          </button>
        </nav>
      </div>

      {/* Active Users Table */}
      {activeTab === 'active' && (
        <>
          {loading.active ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : activeUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No active users found
            </div>
          ) : (
            <>
              <div className="bg-black bg-opacity-30 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-black bg-opacity-50 border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">User</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Email</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Last Visit</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Time Since</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Plan</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {activeUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-black/40">
                        <td className="py-3 px-4 flex items-center">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full mr-2" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-tiktok-pink/30 flex items-center justify-center mr-2">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{user.name}</span>
                          {user.role === 'admin' && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-tiktok-pink/30 text-tiktok-pink">
                              Admin
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{formatDate(user.lastVisitedTime)}</td>
                        <td className="py-3 px-4">{getTimeSinceLastVisit(user.lastVisitedTime)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.subscription?.plan === 'free' ? 'bg-gray-700 text-gray-300' :
                            user.subscription?.plan === 'starter' ? 'bg-blue-900/50 text-blue-300' :
                            user.subscription?.plan === 'growth' ? 'bg-tiktok-pink/30 text-tiktok-pink' :
                            user.subscription?.plan === 'scale' ? 'bg-purple-900/50 text-purple-300' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {user.subscription?.plan?.charAt(0).toUpperCase() + user.subscription?.plan?.slice(1) || 'Free'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex justify-between items-center">
                <p className="text-gray-500 text-sm">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className={`px-3 py-1 rounded ${
                      page === 1
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className={`px-3 py-1 rounded ${
                      page === totalPages
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Inactive Users Table */}
      {activeTab === 'inactive' && (
        <>
          {loading.inactive ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : inactiveUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No inactive users found
            </div>
          ) : (
            <>
              <div className="bg-black bg-opacity-30 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-black bg-opacity-50 border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">User</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Email</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Last Visit</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Inactive For</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Plan</th>
                      <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {inactiveUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-black/40">
                        <td className="py-3 px-4">{user.name}</td>
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{formatDate(user.lastVisitedTime)}</td>
                        <td className="py-3 px-4 text-yellow-500">
                          {user.lastVisitedTime ? getTimeSinceLastVisit(user.lastVisitedTime) : 'Never visited'}
                        </td>
                        <td className="py-3 px-4">
                          {user.subscription?.plan?.charAt(0).toUpperCase() + user.subscription?.plan?.slice(1) || 'Free'}
                        </td>
                        <td className="py-3 px-4">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default UserActivity; 