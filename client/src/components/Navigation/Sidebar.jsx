import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  IoHomeOutline, 
  IoPeopleOutline,
  IoVideocamOutline,
  IoCalendarOutline,
  IoRocketOutline,
  IoSettingsOutline,
  IoCardOutline,
  IoHelpCircleOutline,
  IoLayersOutline,
  IoImageOutline,
  IoLogOutOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoPersonOutline,
  IoDiamondOutline
} from 'react-icons/io5';
import { getSubscriptionUsage } from '../../services/subscriptionService';
import { getProfile } from '../../services/authService';
import StorySceneLogo from '../common/StorySceneLogo';

const Sidebar = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [subscriptionUsage, setSubscriptionUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [refreshedUser, setRefreshedUser] = useState(user);
  
  // Refresh user data when component mounts to get the latest avatar URL
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        const result = await getProfile();
        if (result.success) {
          setRefreshedUser(result.user);
        }
      } catch (error) {
        console.error('Sidebar: Error refreshing user data:', error);
      }
    };
    
    refreshUserData();
  }, []);
  
  // Use the most up-to-date user data
  const currentUser = refreshedUser || user;

  // Fetch subscription usage data - defined as a reusable function
  const fetchSubscriptionUsage = useCallback(async () => {
    try {
      setLoadingUsage(true);
      
      // Only fetch if we have a user with a token
      if (!currentUser || !currentUser.token) {
        console.log('Skipping subscription usage fetch - no authenticated user');
        setSubscriptionUsage(null);
        return;
      }
      
      const response = await getSubscriptionUsage();
      if (response.success) {
        setSubscriptionUsage(response.usage);
      } else {
        console.error('Failed to fetch subscription usage:', response.error);
        // Set to null to use fallback values
        setSubscriptionUsage(null);
      }
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      // Set to null to use fallback values
      setSubscriptionUsage(null);
    } finally {
      setLoadingUsage(false);
    }
  }, [currentUser]);
  
  // Initial fetch on component mount or when user changes
  useEffect(() => {
    // Only attempt to fetch if user is logged in
    if (currentUser && currentUser.token) {
      fetchSubscriptionUsage();
    } else {
      setLoadingUsage(false);
    }
  }, [currentUser, fetchSubscriptionUsage]);
  
  // Add a listener for custom events that might trigger a refresh
  useEffect(() => {
    // Function to handle video creation event
    const handleVideoCreated = () => {
      console.log('Sidebar: Detected video-created event, refreshing subscription data');
      fetchSubscriptionUsage();
    };
    
    // Add event listener
    window.addEventListener('video-created', handleVideoCreated);
    
    // Clean up
    return () => {
      window.removeEventListener('video-created', handleVideoCreated);
    };
  }, [fetchSubscriptionUsage]);
  
  // Generate CSS classes for menu items
  const getMenuItemClasses = (path) => {
    const baseClasses = "flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200";
    const activeClasses = "bg-gradient-to-r from-tiktok-blue/20 to-tiktok-pink/20 text-tiktok-pink";
    const inactiveClasses = "hover:bg-gray-800 text-gray-300 hover:text-white";
    
    return `${baseClasses} ${location.pathname === path ? activeClasses : inactiveClasses}`;
  };
  
  // Only render sidebar if user is logged in and not on landing page
  if (!currentUser || location.pathname === '/') {
    return null;
  }

  const handleLogout = () => {
    // Close dropdown
    setProfileDropdownOpen(false);
    
    if (onLogout) {
      onLogout();
    }
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };
  
  // Always prefer the fresh subscription usage data when available
  let creditsUsed, creditsTotal, creditsRemaining, daysRemaining;
  
  if (subscriptionUsage) {
    // Use the latest data from API
    creditsUsed = subscriptionUsage.creditsUsed;
    creditsTotal = subscriptionUsage.creditsTotal;
    creditsRemaining = subscriptionUsage.creditsRemaining;
    daysRemaining = subscriptionUsage.daysUntilReset;
  } else {
    // Fallback to user prop data
    const subscription = user?.subscription || {};
    creditsUsed = subscription.creditsUsed || 0;
    creditsTotal = subscription.creditsTotal || 0;
    creditsRemaining = subscription.creditsRemaining !== undefined 
      ? subscription.creditsRemaining
      : Math.max(0, creditsTotal - creditsUsed);
    
    daysRemaining = currentUser.subscription?.endDate 
      ? Math.ceil((new Date(currentUser.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)) 
      : 30;
  }
      
  // Calculate the percentage of credits used
  const usagePercentage = creditsTotal 
    ? Math.min(100, (creditsUsed / creditsTotal) * 100)
    : 0;
  
  const plan = user?.subscription?.plan || user?.plan || 'Free';
  
  return (
    <div className="w-64 bg-tiktok-dark h-screen fixed left-0 top-0 pt-6 border-r border-gray-800 overflow-y-auto flex flex-col">
      <div className="p-4 flex-grow">
        <div className="mb-6 px-4 py-2">
          <Link to="/dashboard">
            <StorySceneLogo />
          </Link>
        </div>
        
        {/* Dashboard Navigation */}
        <nav className="mt-6 space-y-1">
          <Link to="/dashboard" className={getMenuItemClasses("/dashboard")}>
            <IoHomeOutline className="text-xl" />
            <span>Home</span>
          </Link>
{/*           
          <Link to="/ugc-avatars" className={getMenuItemClasses("/ugc-avatars")}>
            <IoPeopleOutline className="text-xl" />
            <span>AI UGC Avatars</span>
          </Link>
          
          <Link to="/ugc-ads" className={getMenuItemClasses("/ugc-ads")}>
            <IoLayersOutline className="text-xl" />
            <span>AI UGC Ads</span>
          </Link>
          
          <Link to="/greenscreen-memes" className={getMenuItemClasses("/greenscreen-memes")}>
            <IoImageOutline className="text-xl" />
            <span>Greenscreen Memes</span>
          </Link> */}
          
          
          
          {user.role === 'admin' && <Link to="/admin" className={getMenuItemClasses("/admin")}>
            <IoDiamondOutline className="text-xl" />
            <span>Admin</span>
          </Link>}

          <Link to="/transform" className={getMenuItemClasses("/transform")}>
            <IoRocketOutline className="text-xl" />
            <span>Create Story</span>
          </Link>
          
          <Link to="/create" className={getMenuItemClasses("/create")}>
            <IoImageOutline className="text-xl" />
            <span>Image Variations</span>
          </Link>
           

          {/* <Link to="/campaigns" className={getMenuItemClasses("/campaigns")}>
            <IoRocketOutline className="text-xl" />
            <span>Campaigns</span>
          </Link> */}
        </nav>
        
        {/* Divider */}
        <div className="border-t border-gray-800 my-6"></div>
        
        {/* Account/Settings Navigation */}
        <nav className="space-y-1">
          <Link to="/support" className={getMenuItemClasses("/support")}>
            <IoHelpCircleOutline className="text-xl" />
            <span>Support</span>
          </Link>
          
          {/* <Link to="/account/billing" className={getMenuItemClasses("/account/billing")}>
            <IoCardOutline className="text-xl" />
            <span>Billing</span>
          </Link>
          
          <Link to="/account" className={getMenuItemClasses("/account")}>
            <IoSettingsOutline className="text-xl" />
            <span>Settings</span>
          </Link> */}
        </nav>
        
        {/* Video Usage Stats */}
        <div className="mt-10 px-4 py-4 bg-gray-800 rounded-lg">
          {loadingUsage ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-t-2 border-tiktok-pink rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="text-gray-300 text-sm">
              <p className="font-medium">{creditsRemaining} videos remaining</p>
              <p className="text-xs mt-1 text-gray-400">
                Resets in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-3">
                <div className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink h-1.5 rounded-full" 
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* User Profile & Dropdown */}
      <div className="border-t border-gray-800 mt-4">
        <div className="relative">
          {/* Profile Button */}
          <button 
            onClick={toggleProfileDropdown}
            className="w-full px-4 py-4 flex items-center hover:bg-gray-800 transition duration-200"
          >
            <div className="flex items-center flex-grow">
              {currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="h-10 w-10 rounded-full border-2 border-tiktok-pink"
                  onError={(e) => {
                    console.error('Error loading avatar image:', e);
                    // Prevent infinite loop by removing the error handler
                    e.target.onerror = null;
                    // Set user to have no avatar, which will render the fallback
                    setRefreshedUser(prev => ({
                      ...prev,
                      avatar: null
                    }));
                  }} 
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink flex items-center justify-center text-white font-bold avatar-fallback">
                  {currentUser.name?.charAt(0)}
                </div>
              )}
              <div className="ml-3 flex-grow overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-400 truncate">{currentUser.email}</p>
              </div>
              {profileDropdownOpen ? (
                <IoChevronUpOutline className="text-gray-400 ml-2" />
              ) : (
                <IoChevronDownOutline className="text-gray-400 ml-2" />
              )}
            </div>
          </button>
          
          {/* Dropdown Menu - Now positioned above the profile button */}
          {profileDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 bg-gray-800 border-b border-gray-700 rounded-t-lg shadow-lg overflow-hidden z-10">
              <Link to="/account?tab=profile" 
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 transition duration-200"
                onClick={() => setProfileDropdownOpen(false)}
              >
                <IoPersonOutline className="text-xl" />
                <span>My Account</span>
              </Link>
              
              <Link to="/account?tab=subscription" 
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 transition duration-200"
                onClick={() => setProfileDropdownOpen(false)}
              >
                <IoCardOutline className="text-xl" />
                <span>Subscription</span>
              </Link>
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 transition duration-200"
              >
                <IoLogOutOutline className="text-xl" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 