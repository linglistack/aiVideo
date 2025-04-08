import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../../services/authService';
import StorySceneLogo from '../common/StorySceneLogo';

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
              <StorySceneLogo />
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