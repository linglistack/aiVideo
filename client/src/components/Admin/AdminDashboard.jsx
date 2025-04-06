import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../services/config';
import VisitorStats from './VisitorStats';
import VisitorLogs from './VisitorLogs';
import UserActivity from './UserActivity';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.token) {
      return {
        headers: { 'Content-Type': 'application/json' }
      };
    }
    return {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`
      }
    };
  };

  return (
    <div className="pt-0 min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-800">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-3 px-4 font-medium border-b-2 ${
                activeTab === 'stats'
                  ? 'border-tiktok-pink text-tiktok-pink'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Visitor Statistics
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-3 px-4 font-medium border-b-2 ${
                activeTab === 'logs'
                  ? 'border-tiktok-pink text-tiktok-pink'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Visitor Logs
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-4 font-medium border-b-2 ${
                activeTab === 'users'
                  ? 'border-tiktok-pink text-tiktok-pink'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              User Activity
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="bg-tiktok-dark rounded-lg p-6">
          {activeTab === 'stats' && <VisitorStats authHeader={authHeader} />}
          {activeTab === 'logs' && <VisitorLogs authHeader={authHeader} />}
          {activeTab === 'users' && <UserActivity authHeader={authHeader} />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 