import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../services/config';

const VisitorStats = ({ authHeader }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(30);

  useEffect(() => {
    fetchVisitorStats();
  }, [timeframe]);

  const fetchVisitorStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${config.apiBaseUrl}/admin/visitors/stats?timeframe=${timeframe}`,
        authHeader()
      );
      
      if (response.data.success) {
        setStats(response.data.stats);
      } else {
        setError(response.data.error || 'Failed to fetch visitor statistics');
      }
    } catch (error) {
      console.error('Error fetching visitor stats:', error);
      setError(error.response?.data?.error || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Visitor Statistics</h2>
        <div className="flex gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(parseInt(e.target.value))}
            className="bg-black border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-tiktok-pink"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={fetchVisitorStats}
            className="bg-tiktok-pink text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : stats ? (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-black bg-opacity-30 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm mb-1">Total Visitors</h3>
              <p className="text-3xl font-bold">{stats.totalVisitors}</p>
              <p className="text-gray-500 text-xs mt-2">
                Last {timeframe} days
              </p>
            </div>
            
            <div className="bg-black bg-opacity-30 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm mb-1">Unique Visitors</h3>
              <p className="text-3xl font-bold">{stats.uniqueVisitors}</p>
              <p className="text-gray-500 text-xs mt-2">
                Distinct IP addresses
              </p>
            </div>
            
            <div className="bg-black bg-opacity-30 rounded-xl p-5">
              <h3 className="text-gray-400 text-sm mb-1">Authenticated Visits</h3>
              <p className="text-3xl font-bold">{stats.authenticatedVisitors}</p>
              <p className="text-gray-500 text-xs mt-2">
                {stats.authenticatedVisitors > 0 
                  ? `${Math.round((stats.authenticatedVisitors / stats.totalVisitors) * 100)}% of total visits` 
                  : 'No authenticated visits'}
              </p>
            </div>
          </div>

          {/* Daily Visitors Chart */}
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Daily Visitors</h3>
            <div className="bg-black bg-opacity-30 rounded-xl p-5 h-80">
              {stats.dailyCounts && stats.dailyCounts.length > 0 ? (
                <div className="h-full flex items-end">
                  {stats.dailyCounts.map((day, index) => {
                    const maxCount = Math.max(...stats.dailyCounts.map(d => d.count));
                    const height = (day.count / maxCount) * 100;
                    
                    const date = new Date(day._id);
                    const formattedDate = date.toLocaleDateString('en-US', {
                      month: 'short', 
                      day: 'numeric',
                      timeZone: 'America/New_York'
                    });
                    
                    return (
                      <div key={day._id} className="flex flex-col items-center flex-1">
                        <div className="w-full px-1">
                          <div
                            className="bg-gradient-to-t from-tiktok-blue to-tiktok-pink rounded-t-sm"
                            style={{ height: `${height}%` }}
                          ></div>
                        </div>
                        <div className="mt-2 text-xs text-gray-400 truncate w-full text-center">
                          {formattedDate}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No daily visit data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Paths */}
          <div>
            <h3 className="text-lg font-medium mb-4">Most Visited Pages</h3>
            <div className="bg-black bg-opacity-30 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-black bg-opacity-50 border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Path</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-300">Visits</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-300">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {stats.topPaths && stats.topPaths.length > 0 ? (
                    stats.topPaths.map((path, index) => (
                      <tr key={index} className="hover:bg-black/40">
                        <td className="py-3 px-4 text-left truncate max-w-xs">
                          {path._id}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {path.count}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {Math.round((path.count / stats.totalVisitors) * 100)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-4 text-center text-gray-500">
                        No path data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No visitor data available
        </div>
      )}
    </div>
  );
};

export default VisitorStats; 