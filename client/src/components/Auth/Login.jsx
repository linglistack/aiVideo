import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login, googleLogin } from '../../services/authService';
import { GoogleLogin } from '@react-oauth/google';
import jwt_decode from 'jwt-decode';
import { 
  IoAlertCircleOutline,
  IoCheckmarkCircleOutline
} from 'react-icons/io5';

// TikTok logo SVG
const TikTokLogo = () => (
  <svg height="42" width="118" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 42" className="fill-current">
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
  </svg>
);

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [returnPath, setReturnPath] = useState('');

  const { email, password } = formData;
  
  // Get return_to from query parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const returnTo = queryParams.get('return_to');
    if (returnTo) {
      console.log('Return path detected:', returnTo);
      setReturnPath(returnTo);
    }
  }, [location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      console.log("Submitting login with:", { 
        email, 
        password: password ? "[PRESENT]" : "[MISSING]" 
      });
      
      const response = await login(email, password);
      
      if (onLogin) {
        onLogin(response.user);
      }
      
      // Check for return_to query parameter
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get('return_to');
      
      if (returnTo) {
        console.log("Redirecting to:", returnTo);
        navigate(returnTo);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const decoded = jwt_decode(credentialResponse.credential);
      console.log("Google login successful:", decoded);
      
      // Call your backend with the Google token
      const response = await googleLogin(credentialResponse.credential);
      
      if (onLogin) {
        onLogin(response.user);
      }
      
      // Navigate to return path if it exists, otherwise to dashboard
      if (returnPath) {
        navigate(returnPath);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.error || 'Failed to login with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <TikTokLogo />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter your credentials to access your account
          </p>
        </div>
        
        <div className="mt-8 bg-tiktok-dark shadow-2xl rounded-xl overflow-hidden">
          <div className="px-6 py-8 sm:px-10">
            {error && (
              <div className="rounded-xl mb-6 bg-red-900/40 border border-red-500/50 px-4 py-3 text-sm text-red-200 flex items-center">
                <IoAlertCircleOutline className="text-red-300 mr-2 flex-shrink-0 h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleChange}
                    className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 
                    focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none 
                    placeholder-gray-500"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={handleChange}
                    className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 
                    focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none 
                    placeholder-gray-500"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center justify-end mt-2">
                  <div className="text-sm">
                    <Link to="/forgot-password" className="font-medium text-tiktok-pink hover:text-tiktok-blue">
                      Forgot your password?
                    </Link>
                  </div>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium 
                  py-3 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center 
                  justify-center w-full"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <span className="font-medium text-base">Sign in</span>
                  )}
                </button>
              </div>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-tiktok-dark text-gray-400">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  shape="pill"
                  theme="filled_black"
                  text="signin_with"
                  locale="en"
                />
              </div>
            </div>
          </div>
          
          <div className="px-6 py-4 bg-[#0a0d14] sm:px-10">
            <p className="text-sm text-center text-gray-400">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="font-medium text-tiktok-pink hover:text-tiktok-blue transition-colors duration-200"
              >
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 