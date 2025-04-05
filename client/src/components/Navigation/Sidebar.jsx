import React, { useState, useEffect } from 'react';
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
  IoPersonOutline
} from 'react-icons/io5';
import { getSubscriptionUsage } from '../../services/subscriptionService';
import { getProfile } from '../../services/authService';

// TikTok logo SVG
const TikTokLogo = () => (
  <svg height="42" width="118" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 42">
    <path d="M9.87537 16.842V15.7233C9.49211 15.6721 9.10246 15.6401 8.70003 15.6401C3.90288 15.6338 0 19.5399 0 24.3475C0 27.2947 1.46917 29.9031 3.71764 31.4822C2.26763 29.9287 1.37974 27.8381 1.37974 25.5494C1.37974 20.8121 5.17403 16.9507 9.87537 16.842Z" fill="#25F4EE"></path>
    <path d="M10.0862 29.5259C12.2261 29.5259 13.9763 27.819 14.053 25.6965L14.0594 6.72822H17.5215C17.4512 6.33824 17.4129 5.93548 17.4129 5.52632H12.686L12.6796 24.4946C12.603 26.6171 10.8527 28.324 8.71286 28.324C8.04854 28.324 7.42255 28.1578 6.86682 27.8637C7.58224 28.8674 8.75758 29.5259 10.0862 29.5259Z" fill="#25F4EE"></path>
    <path d="M23.9923 13.166V12.1112C22.6701 12.1112 21.4436 11.7212 20.4088 11.0435C21.3286 12.0984 22.5742 12.8656 23.9923 13.166Z" fill="#25F4EE"></path>
    <path d="M20.4088 11.0435C19.3995 9.88639 18.7927 8.37762 18.7927 6.72821H17.528C17.8537 8.53106 18.9269 10.0782 20.4088 11.0435Z" fill="#FE2C55"></path>
    <path d="M8.70642 20.3646C6.51544 20.3646 4.73328 22.1483 4.73328 24.3411C4.73328 25.8691 5.602 27.1988 6.86676 27.8637C6.39408 27.2116 6.11302 26.4125 6.11302 25.543C6.11302 23.3502 7.89518 21.5665 10.0862 21.5665C10.495 21.5665 10.891 21.6368 11.2615 21.7519V16.9188C10.8782 16.8676 10.4886 16.8356 10.0862 16.8356C10.0159 16.8356 9.95202 16.842 9.88175 16.842V21.7519C9.50488 21.6368 9.11523 21.5665 8.70642 21.5665Z" fill="#FE2C55"></path>
    <path d="M23.9921 13.166V16.842C21.5392 16.842 19.2652 16.0557 17.4127 14.7259V24.3475C17.4127 29.1487 13.5099 33.0548 8.70631 33.0548C6.85388 33.0548 5.12921 32.4547 3.71753 31.4822C5.30806 33.1117 7.57569 34.1266 10.0861 34.1266C14.8832 34.1266 18.786 30.2205 18.786 25.4193V15.7975C20.6386 17.1273 22.9125 17.9136 25.3654 17.9136V13.3762C24.8918 13.3762 24.4314 13.3032 23.9921 13.166Z" fill="#FE2C55"></path>
    <path d="M17.4127 24.3475V14.7259C19.2652 16.0557 21.5392 16.842 23.9921 16.842V13.3762C22.574 13.0654 21.3284 12.2982 20.4086 11.0435C18.9266 10.0782 17.8599 8.53106 17.5213 6.72821H14.0592L14.0528 25.6964C13.9762 27.8189 12.2259 29.5259 10.0861 29.5259C8.75742 29.5259 7.58847 28.8674 6.86028 27.8701C5.59551 27.1988 4.72679 25.8755 4.72679 24.3475C4.72679 22.1547 6.50895 20.371 8.69993 20.371C9.10874 20.371 9.50478 20.4413 9.87527 20.5564V15.6465C5.17393 15.7629 1.37964 19.6242 1.37964 24.3475C1.37964 26.6363 2.26753 28.7268 3.71753 30.2804C5.12921 31.2529 6.85389 31.853 8.70632 31.853C13.5099 31.853 17.4127 27.9469 17.4127 24.3475Z" fill="white"></path>
  </svg>
);

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
  
  // Fetch subscription usage data when component mounts or route changes
  useEffect(() => {
    const fetchSubscriptionUsage = async () => {
      try {
        setLoadingUsage(true);
        
        // Only fetch if we have a user with a token
        if (!currentUser || !currentUser.token) {
          console.log('Skipping subscription usage fetch - no authenticated user');
          setSubscriptionUsage(null);
          return;
        }
        
        const response = await getSubscriptionUsage();
        console.log('ssss', response, currentUser)
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
    };
    
    // Only attempt to fetch if user is logged in
    if (currentUser && currentUser.token) {
      fetchSubscriptionUsage();
    } else {
      setLoadingUsage(false);
    }
  }, [currentUser, location.pathname]);
  
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
  
  // Calculate video usage metrics
  const videosRemaining = (currentUser.subscription?.videosLimit - currentUser.subscription?.videosUsed) || 5;
    
  const daysRemaining = subscriptionUsage 
    ? subscriptionUsage.daysUntilReset 
    : currentUser.subscription?.endDate 
      ? Math.ceil((new Date(currentUser.subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)) 
      : 30;
      
  // Calculate the percentage of videos used
  const usagePercentage = subscriptionUsage 
    ? ((subscriptionUsage.videosUsed || 0) / (subscriptionUsage.videosLimit || 1)) * 100 
    : currentUser.subscription?.videosLimit 
      ? ((currentUser.subscription?.videosUsed || 0) / currentUser.subscription.videosLimit) * 100 
      : 50;
  
  return (
    <div className="w-64 bg-tiktok-dark h-screen fixed left-0 top-0 pt-6 border-r border-gray-800 overflow-y-auto flex flex-col">
      <div className="p-4 flex-grow">
        <div className="mb-6 px-4 py-2">
          <Link to="/dashboard">
            <TikTokLogo />
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
          
          <Link to="/create" className={getMenuItemClasses("/create")}>
            <IoVideocamOutline className="text-xl" />
            <span>Videos</span>
          </Link>
          
          {/* <Link to="/schedule" className={getMenuItemClasses("/schedule")}>
            <IoCalendarOutline className="text-xl" />
            <span>Schedule</span>
          </Link>
          
          <Link to="/campaigns" className={getMenuItemClasses("/campaigns")}>
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
              <p className="font-medium">{videosRemaining} videos remaining</p>
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
                    e.target.onerror = null;
                    e.target.src = ''; // Clear src on error
                    // Use initial fallback
                    e.target.style.display = 'none';
                    e.target.parentElement.querySelector('.avatar-fallback').style.display = 'flex';
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