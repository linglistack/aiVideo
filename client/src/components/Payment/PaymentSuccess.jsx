import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifySession } from '../../services/subscriptionService';
import { getCurrentUser, getProfile } from '../../services/authService';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const verifyPayment = async () => {
      try {
        // If we have a session ID, verify it
        if (sessionId) {
          const result = await verifySession(sessionId);
          setSubscription(result.subscription);
        } else {
          // Otherwise, just get the user's current subscription
          const profileResult = await getProfile();
          setSubscription(profileResult.user.subscription);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setError('There was an issue verifying your payment. Please contact support.');
      } finally {
        setLoading(false);
      }
    };
    
    verifyPayment();
  }, [searchParams]);
  
  if (loading) {
    return (
      <div className="bg-black min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Verifying your payment...</h2>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-black min-h-screen text-white py-12">
        <div className="container mx-auto px-4 max-w-md text-center">
          <div className="bg-red-500 bg-opacity-20 p-4 rounded-lg mb-6">
            <span className="text-red-500 text-5xl">✕</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">Payment Verification Failed</h1>
          <p className="mb-6">{error}</p>
          <div className="flex flex-col space-y-4">
            <Link to="/pricing" className="bg-tiktok-pink text-white py-3 px-6 rounded-md font-semibold hover:bg-opacity-90 transition-all">
              Try Again
            </Link>
            <Link to="/support" className="text-tiktok-pink">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-black min-h-screen text-white py-12">
      <div className="container mx-auto px-4 max-w-md text-center">
        <div className="bg-green-500 bg-opacity-20 p-8 rounded-full inline-block mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
        <p className="text-xl mb-8">Thank you for subscribing to our {subscription?.plan} plan!</p>
        
        <div className="bg-tiktok-dark p-6 rounded-lg mb-8 text-left">
          <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Plan</span>
              <span className="font-medium capitalize">{subscription?.plan}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className="font-medium text-green-500">Active</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Billing Cycle</span>
              <span className="font-medium capitalize">{subscription?.billingCycle}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Videos Limit</span>
              <span className="font-medium">{subscription?.videosLimit} videos</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Next Billing Date</span>
              <span className="font-medium">
                {subscription?.endDate 
                  ? new Date(subscription.endDate).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-4">
          <Link to="/dashboard" className="bg-tiktok-pink text-white py-3 px-6 rounded-md font-semibold hover:bg-opacity-90 transition-all">
            Go to Dashboard
          </Link>
          <Link to="/create-video" className="bg-tiktok-blue text-white py-3 px-6 rounded-md font-semibold hover:bg-opacity-90 transition-all">
            Create Your First Video
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess; 