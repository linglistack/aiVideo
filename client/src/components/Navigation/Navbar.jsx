import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../services/authService';

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
    <path d="M30.0477 13.1787H44.8225L43.4683 17.411H39.6357V33.0548H34.8577V17.411L30.0541 17.4173L30.0477 13.1787Z" fill="white"></path>
    <path d="M69.0317 13.1787H84.1514L82.7972 17.411H78.6261V33.0548H73.8417V17.411L69.0381 17.4173L69.0317 13.1787Z" fill="white"></path>
    <path d="M45.7295 22.015H50.4628V33.0548H45.755L45.7295 22.015Z" fill="white"></path>
    <path d="M52.347 13.1277H57.0802V22.015H52.347V13.1277Z" fill="white"></path>
    <path d="M52.347 22.015H57.0802V33.0548H52.347V22.015Z" fill="white"></path>
    <path d="M59.4308 13.1277H64.1641V33.0548H59.4308V13.1277Z" fill="white"></path>
    <path d="M67.3218 13.1277H72.0551V18.7707H67.3218V13.1277Z" fill="white"></path>
    <path d="M85.6839 13.1277H90.4172V33.0548H85.6839V13.1277Z" fill="white"></path>
    <path d="M93.1936 13.1277H97.9269V33.0548H93.1936V13.1277Z" fill="white"></path>
    <path d="M45.7295 13.1277H50.4628V18.7707H45.7295V13.1277Z" fill="white"></path>
    <path d="M98.1926 24.0424C98.2514 27.6539 100.731 29.7282 103.767 29.7282C105.163 29.7282 106.641 29.2505 107.614 28.0856L111.238 30.1071C109.321 32.9196 106.358 34.1267 103.381 34.1267C97.6852 34.1267 93.2696 30.2207 93.2696 24.1722C93.2696 18.1236 97.5576 13.1786 103.381 13.1786C109.003 13.1786 113.023 17.7767 113.023 24.1722C113.023 24.064 113.023 24.0424 113.016 23.7579L98.1926 24.0424ZM108.171 20.1929C107.886 17.9071 106.024 17.2646 103.825 17.2646C101.312 17.2646 99.4863 18.5252 98.991 20.1929H108.171Z" fill="white"></path>
  </svg>
);

const Navbar = ({ user }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(!!user);
  const navigate = useNavigate();

  // Update local state when user prop changes
  useEffect(() => {
    setIsUserLoggedIn(!!user);
  }, [user]);

  // Listen for logout events
  useEffect(() => {
    const handleUserLogout = () => {
      console.log('Navbar: Detected logout event');
      setIsUserLoggedIn(false);
    };

    window.addEventListener('user-logout', handleUserLogout);
    
    return () => {
      window.removeEventListener('user-logout', handleUserLogout);
    };
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-tiktok-dark border-b border-gray-800 fixed w-full z-20">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isUserLoggedIn ? 'ml-16 md:ml-64' : ''}`}>
        <div className="flex justify-between h-16">
          {/* Logo - only show when not logged in or on mobile */}
          <div className={`flex items-center ${isUserLoggedIn ? 'md:hidden' : ''}`}>
            <Link to="/" className="flex-shrink-0">
              <TikTokLogo />
            </Link>
          </div>
          
          {/* Desktop menu - only show items when not logged in */}
          {!isUserLoggedIn && (
            <div className="hidden md:flex md:items-center md:space-x-4">
              <Link to="/product" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-tiktok-pink">
                Product
              </Link>
              <Link to="/pricing" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-tiktok-pink">
                Pricing
              </Link>
            </div>
          )}
          
          {/* Page title - only show when logged in */}
          {isUserLoggedIn && (
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white hidden md:block">
                {window.location.pathname === '/dashboard' && 'Dashboard'}
                {window.location.pathname === '/create' && 'Create Video'}
                {window.location.pathname === '/account' && 'Account Settings'}
                {window.location.pathname === '/ugc-avatars' && 'AI UGC Avatars'}
                {window.location.pathname === '/ugc-ads' && 'AI UGC Ads'}
                {window.location.pathname === '/greenscreen-memes' && 'Greenscreen Memes'}
                {window.location.pathname === '/schedule' && 'Content Schedule'}
                {window.location.pathname === '/campaigns' && 'Campaigns'}
                {window.location.pathname === '/support' && 'Support'}
              </h1>
            </div>
          )}
          
          {/* Authentication section - only show buttons when not logged in */}
          <div className="flex items-center">
            {!isUserLoggedIn && (
              <div className="flex space-x-2">
                <Link 
                  to="/login" 
                  className="px-5 py-2 border border-gray-700 rounded-full text-sm font-medium text-gray-300 hover:bg-gray-800"
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="px-5 py-2 bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white rounded-full text-sm font-medium hover:bg-opacity-90"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
          
          {/* Mobile menu button - only show when not logged in */}
          {!isUserLoggedIn && (
            <div className="flex md:hidden items-center">
              <button 
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-tiktok-pink focus:outline-none"
              >
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile menu, show/hide based on menu state - only for non-logged in users */}
      {mobileMenuOpen && !isUserLoggedIn && (
        <div className="md:hidden bg-tiktok-dark border-t border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              to="/product" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-tiktok-pink"
              onClick={() => setMobileMenuOpen(false)}
            >
              Product
            </Link>
            <Link 
              to="/pricing" 
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-tiktok-pink"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 