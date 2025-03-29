import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import TikTokLogo from './TikTokLogo';

const Navbar = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  
  return (
    <header className="border-b border-gray-800 py-4 bg-black text-white">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center space-x-2">
            <TikTokLogo className="h-8 w-8" />
            <h1 className="text-xl font-bold">TikTok Creator</h1>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          {isLandingPage && (
            <>
              <Link to="/product" className="text-white hover:text-gray-300 transition-colors">
                PRODUCT
              </Link>
              <Link to="/pricing" className="text-white hover:text-gray-300 transition-colors">
                PRICING
              </Link>
            </>
          )}
        </nav>
        
        <div className="space-x-4">
          <Link to="/login" className="text-red-500 hover:text-red-400 transition-colors">Login</Link>
          <Link to="/register" className="bg-red-500 px-4 py-2 rounded-full hover:bg-red-600 transition-colors">
            Sign Up
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar; 