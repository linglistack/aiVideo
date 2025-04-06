import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../services/config';

const VisitorLogs = ({ authHeader }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    path: '',
    ip: '',
    authenticated: ''
  });

  useEffect(() => {
    fetchVisitorLogs();
  }, [page]);

  const fetchVisitorLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        page,
        limit: 15
      });
      
      // Add filters if they exist
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });
      
      const response = await axios.get(
        `${config.apiBaseUrl}/admin/visitors?${queryParams.toString()}`,
        authHeader()
      );
      
      if (response.data.success) {
        setLogs(response.data.logs);
        setTotalPages(response.data.pages);
      } else {
        setError(response.data.error || 'Failed to fetch visitor logs');
      }
    } catch (error) {
      console.error('Error fetching visitor logs:', error);
      setError(error.response?.data?.error || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page when filters change
    fetchVisitorLogs();
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      path: '',
      ip: '',
      authenticated: ''
    });
    setPage(1);
    fetchVisitorLogs();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Visitor Logs</h2>
        <button
          onClick={fetchVisitorLogs}
          className="bg-tiktok-pink text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-black bg-opacity-30 rounded-xl p-5 mb-6">
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-tiktok-pink"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-tiktok-pink"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Path</label>
            <input
              type="text"
              name="path"
              placeholder="/api/videos"
              value={filters.path}
              onChange={handleFilterChange}
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-tiktok-pink"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">IP Address</label>
            <input
              type="text"
              name="ip"
              placeholder="192.168.1"
              value={filters.ip}
              onChange={handleFilterChange}
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-tiktok-pink"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Authentication</label>
            <select
              name="authenticated"
              value={filters.authenticated}
              onChange={handleFilterChange}
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-tiktok-pink"
            >
              <option value="">All</option>
              <option value="true">Authenticated</option>
              <option value="false">Unauthenticated</option>
            </select>
          </div>
          
          <div className="flex gap-2 items-end md:col-span-3">
            <button
              type="submit"
              className="bg-tiktok-pink text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-opacity-90"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No visitor logs found matching your criteria
        </div>
      ) : (
        <>
          <div className="bg-black bg-opacity-30 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-black bg-opacity-50 border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Timestamp</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">IP Address</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Path</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">User</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Location</th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-300">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-black/40">
                    <td className="py-3 px-4">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4 truncate max-w-[150px]">
                      {log.path}
                    </td>
                    <td className="py-3 px-4">
                      {log.isAuthenticated ? (
                        <span className="flex items-center">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          {log.userId?.name || 'Authenticated User'}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <span className="inline-block w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                          Anonymous
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.location?.country ? `${log.location.country}, ${log.location.region || ''}` : 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      {log.userAgent?.browser} / {log.userAgent?.os}
                    </td>
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
    </div>
  );
};

export default VisitorLogs; 