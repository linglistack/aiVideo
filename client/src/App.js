import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import Navbar from './components/Navigation/Navbar';
import Sidebar from './components/Navigation/Sidebar';
import LandingPage from './components/LandingPage/LandingPage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import VideoGenerator from './components/VideoGenerator/VideoGenerator';
import Support from './components/Support/Support';
import Terms from './components/Legal/Terms';
import Privacy from './components/Legal/Privacy';
import Help from './components/Help/Help';
import Contact from './components/Contact/Contact';
import { getCurrentUser, logout, getProfile } from './services/authService';
import Pricing from './components/Pricing/Pricing';
import PaymentForm from './components/PaymentForm/PaymentForm';
import PaymentSuccess from './components/PaymentSuccess/PaymentSuccess';
import ManageSubscription from './components/ManageSubscription/ManageSubscription';
import Account from './components/Account/Account';

// Load Stripe outside of component render to avoid recreating Stripe object
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Wrapper component to refresh user data
const DashboardWithRefresh = ({ user, setUser }) => {
  const location = useLocation();
  const [refreshed, setRefreshed] = useState(false);
  const [subscriptionUsage, setSubscriptionUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  
  useEffect(() => {
    // Skip if already refreshed
    if (refreshed) return;
    
    // If coming from payment-success, refresh user data
    const refreshUserData = async () => {
      try {
        // Mark as refreshed before API call to prevent loops
        setRefreshed(true);
        
        const result = await getProfile();
        if (result.success) {
          const updatedUser = {
            ...user,
            subscription: result.user.subscription
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    };
    
    refreshUserData();
  }, [location]); // Remove user and setUser from dependencies
  
  // Fetch subscription usage data
  useEffect(() => {
    const fetchSubscriptionUsage = async () => {
      try {
        setLoadingUsage(true);
        // Import the service dynamically to avoid circular imports
        const { getSubscriptionUsage } = await import('./services/subscriptionService');
        const response = await getSubscriptionUsage();
        
        if (response.success) {
          setSubscriptionUsage(response.usage);
        } else {
          console.error('Failed to fetch subscription usage:', response.error);
        }
      } catch (error) {
        console.error('Error fetching subscription usage:', error);
      } finally {
        setLoadingUsage(false);
      }
    };
    
    fetchSubscriptionUsage();
  }, []);
  
  return <Dashboard user={user} subscriptionUsage={subscriptionUsage} loadingUsage={loadingUsage} />;
};

// Wrapper component for Account to get subscription usage data
const AccountWithUsage = ({ user, setUser }) => {
  const [subscriptionUsage, setSubscriptionUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  
  // Fetch subscription usage data
  useEffect(() => {
    const fetchSubscriptionUsage = async () => {
      try {
        setLoadingUsage(true);
        // Import the service dynamically to avoid circular imports
        const { getSubscriptionUsage } = await import('./services/subscriptionService');
        const response = await getSubscriptionUsage();
        
        if (response.success) {
          setSubscriptionUsage(response.usage);
        } else {
          console.error('Failed to fetch subscription usage:', response.error);
        }
      } catch (error) {
        console.error('Error fetching subscription usage:', error);
      } finally {
        setLoadingUsage(false);
      }
    };
    
    fetchSubscriptionUsage();
  }, []);
  
  return <Account user={user} setUser={setUser} subscriptionUsage={subscriptionUsage} loadingUsage={loadingUsage} />;
};

// Wrapper component to refresh user data before payment
const PaymentFormWithRefresh = ({ user, setUser }) => {
  const [refreshing, setRefreshing] = useState(true);
  const [refreshError, setRefreshError] = useState(false);
  const [alreadyRefreshed, setAlreadyRefreshed] = useState(false);
  
  useEffect(() => {
    // Skip if we've already refreshed this session
    if (alreadyRefreshed) {
      setRefreshing(false);
      return;
    }
    
    const refreshUserData = async () => {
      try {
        setRefreshing(true);
        console.log('PaymentFormWithRefresh: Refreshing user data...');
        
        // Set alreadyRefreshed to true BEFORE making the API call to prevent loops
        setAlreadyRefreshed(true);
        
        const result = await getProfile();
        
        if (result.success) {
          // Create a new user object with refreshed token and data
          const updatedUser = {
            ...user,
            ...result.user,
            token: result.token || user.token // Use new token if provided, or keep existing
          };
          
          // Update the user in localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          console.log('User data refreshed before payment');
          
          // Check if there's a pending plan upgrade stored from a previous session
          const pendingPlanId = localStorage.getItem('pendingPlanUpgrade');
          const pendingCycle = localStorage.getItem('pendingBillingCycle');
          
          if (pendingPlanId) {
            // Clear the pending plan from localStorage
            localStorage.removeItem('pendingPlanUpgrade');
            localStorage.removeItem('pendingBillingCycle');
          }
        } else {
          console.error('Failed to refresh user data:', result.error);
          setRefreshError(true);
        }
      } catch (error) {
        console.error('Error refreshing user data before payment:', error);
        setRefreshError(true);
      } finally {
        setRefreshing(false);
      }
    };
    
    refreshUserData();
  }, [user, setUser]); // Removed alreadyRefreshed from dependencies
  
  if (refreshing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-t-4 border-tiktok-pink rounded-full"></div>
      </div>
    );
  }
  
  if (refreshError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-tiktok-dark p-6 rounded-lg text-center max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold mb-4 text-white">Authentication Error</h2>
          <p className="text-gray-300 mb-6">
            We couldn't verify your account. Please try logging out and back in.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setUser(null); // Clear React state first
                logout('/login?return_to=' + encodeURIComponent('/payment'));
              }}
              className="bg-tiktok-pink text-white py-2 px-4 rounded-md hover:bg-opacity-90"
            >
              Logout
            </button>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="border border-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return <PaymentForm />;
};

const BillingPortalRedirect = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  useEffect(() => {
    const redirectToBillingPortal = async () => {
      try {
        // Import the service dynamically to avoid circular imports
        const { createBillingPortalSession } = await import('./services/subscriptionService');
        const response = await createBillingPortalSession();
        
        if (response.success && response.url) {
          window.location.href = response.url;
        } else {
          throw new Error(response.error || 'Failed to access billing portal');
        }
      } catch (err) {
        console.error('Error accessing billing portal:', err);
        setError('Failed to access billing portal. Please try again.');
        setLoading(false);
      }
    };
    
    redirectToBillingPortal();
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="animate-spin h-16 w-16 border-t-4 border-tiktok-pink rounded-full mb-6"></div>
        <p className="text-white text-xl">Redirecting to billing portal...</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="bg-tiktok-dark p-8 rounded-lg max-w-md">
        <h2 className="text-xl font-bold mb-4 text-white">Error</h2>
        <p className="text-gray-300 mb-6">{error}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate('/account/subscription')}
            className="bg-tiktok-pink text-white py-2 px-4 rounded-md hover:bg-opacity-90"
          >
            Back to Subscription
          </button>
          <button
            onClick={() => window.location.reload()}
            className="border border-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

// Main content component that can use router hooks
const AppContent = ({ user, setUser, handleLogout }) => {
  const location = useLocation();
  
  // Don't add margin on the homepage
  const isHomePage = location.pathname === '/';
  const isPublicPage = ['/terms', '/privacy', '/help', '/contact'].includes(location.pathname);
  
  if (!user && location.pathname !== '/' && 
      location.pathname !== '/login' && 
      location.pathname !== '/register' &&
      location.pathname !== '/pricing' &&
      location.pathname !== '/product' &&
      location.pathname !== '/terms' &&
      location.pathname !== '/privacy' &&
      location.pathname !== '/help' &&
      location.pathname !== '/contact') {
    return <Navigate to="/login" />;
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      {((!user) || (user && isHomePage) || (isPublicPage && !user)) && <Navbar user={user} />}
      <Sidebar user={user} onLogout={handleLogout} />
      
      {/* Main content area - adjust sidebar margin based on page and login status */}
      <div className={`
        ${user && !isHomePage ? 'ml-64' : ''} 
        ${(!user || isHomePage) ? 'pt-16' : ''}
      `}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={setUser} />
          } />
          <Route path="/register" element={
            user ? <Navigate to="/dashboard" /> : <Register onRegister={setUser} />
          } />
          <Route path="/dashboard" element={
            user ? <DashboardWithRefresh user={user} setUser={setUser} /> : <Navigate to="/login" />
          } />
          <Route path="/create" element={
            user ? <VideoGenerator /> : <Navigate to="/login" />
          } />
          <Route path="/ugc-avatars" element={
            user ? <div className="p-6">
              <h1 className="text-3xl font-bold mb-6">AI UGC Avatars</h1>
              <p>Browse and select from our library of 200+ AI avatars</p>
            </div> : <Navigate to="/login" />
          } />
          <Route path="/ugc-ads" element={
            user ? <div className="p-6">
              <h1 className="text-3xl font-bold mb-6">AI UGC Ads</h1>
              <p>Create user-generated content ads with AI</p>
            </div> : <Navigate to="/login" />
          } />
          <Route path="/greenscreen-memes" element={
            user ? <div className="p-6">
              <h1 className="text-3xl font-bold mb-6">Greenscreen Memes</h1>
              <p>Create engaging greenscreen meme videos</p>
            </div> : <Navigate to="/login" />
          } />
          <Route path="/schedule" element={
            user ? <div className="p-6">
              <h1 className="text-3xl font-bold mb-6">Content Schedule</h1>
              <p>Plan and schedule your TikTok content</p>
            </div> : <Navigate to="/login" />
          } />
          <Route path="/campaigns" element={
            user ? <div className="p-6">
              <h1 className="text-3xl font-bold mb-6">Campaigns</h1>
              <p>Manage your marketing campaigns</p>
            </div> : <Navigate to="/login" />
          } />
          <Route path="/support" element={<Support />} />
          <Route path="/product" element={<LandingPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment" element={
            user ? <PaymentFormWithRefresh user={user} setUser={setUser} /> : <Navigate to="/login" />
          } />
          <Route path="/payment-success" element={user ? <PaymentSuccess /> : <Navigate to="/login" />} />
          <Route path="/account" element={user ? <AccountWithUsage user={user} setUser={setUser} /> : <Navigate to="/login" />} />
          <Route path="/account/subscription" element={user ? <ManageSubscription /> : <Navigate to="/login" />} />
          <Route path="/account/billing" element={
            user ? <BillingPortalRedirect /> : <Navigate to="/login" />
          } />
          
          {/* New routes for Terms, Privacy, Help, and Contact */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/help" element={<Help />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const loggedInUser = getCurrentUser();
    if (loggedInUser) {
      setUser(loggedInUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    console.log('App.js: handleLogout called');
    
    // First clear user state in React to update the UI immediately
    setUser(null);
    
    // Instead of letting authService handle the redirect,
    // we'll clear the auth data but leave the navigation to React Router
    logout(null); // Pass null to indicate no redirect should happen
    
    // Then navigate to home page directly from here
    // React Router will handle this more cleanly than a full page reload
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin h-16 w-16 border-t-4 border-tiktok-pink rounded-full"></div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
      <BrowserRouter>
        <Elements stripe={stripePromise}>
          <AppContent 
            user={user} 
            setUser={handleLogin}
            handleLogout={handleLogout} 
          />
        </Elements>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;