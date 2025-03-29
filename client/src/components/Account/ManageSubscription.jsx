import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSubscriptionStatus, cancelSubscription } from '../../services/subscriptionService';

const ManageSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await getSubscriptionStatus();
        setSubscription(response.subscription);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setError('Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscription();
  }, []);
  
  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      await cancelSubscription();
      
      // Update subscription status
      const response = await getSubscriptionStatus();
      setSubscription(response.subscription);
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setError('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };
  
  if (loading) {
    return <div className="text-center py-12 text-white">Loading subscription details...</div>;
  }
  
  return (
    <div className="bg-black min-h-screen text-white py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Manage Subscription</h1>
        
        {error && (
          <div className="bg-red-500 bg-opacity-20 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <div className="bg-tiktok-dark p-6 rounded-lg mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold capitalize">{subscription.plan} Plan</h2>
              <p className="text-gray-400">
                {subscription.isActive ? (
                  <span className="text-green-500">Active</span>
                ) : (
                  <span className="text-yellow-500">
                    Canceled (Expires {new Date(subscription.endDate).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
            
            {subscription.plan !== 'free' && subscription.isActive && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="border border-red-500 text-red-500 px-4 py-2 rounded-md hover:bg-red-500 hover:bg-opacity-10 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
            
            {subscription.plan === 'free' && (
              <Link
                to="/pricing"
                className="bg-tiktok-pink text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
              >
                Upgrade
              </Link>
            )}
            
            {!subscription.isActive && subscription.plan !== 'free' && (
              <Link
                to="/pricing"
                className="bg-tiktok-pink text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
              >
                Renew Subscription
              </Link>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-400">Billing Cycle</span>
              <span className="font-medium capitalize">{subscription.billingCycle || 'N/A'}</span>
            </div>
            
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-400">Start Date</span>
              <span className="font-medium">
                {subscription.startDate 
                  ? new Date(subscription.startDate).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-400">Next Billing Date</span>
              <span className="font-medium">
                {subscription.endDate 
                  ? new Date(subscription.endDate).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
            
            <div className="flex justify-between border-b border-gray-800 pb-3">
              <span className="text-gray-400">Videos Used</span>
              <span className="font-medium">{subscription.videosUsed} / {subscription.videosLimit}</span>
            </div>
            
            {subscription.planDetails && (
              <div className="flex justify-between border-b border-gray-800 pb-3">
                <span className="text-gray-400">Price</span>
                <span className="font-medium">
                  ${subscription.billingCycle === 'yearly' 
                    ? subscription.planDetails.yearlyPrice
                    : subscription.planDetails.monthlyPrice}
                  /{subscription.billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Usage Section */}
        <div className="bg-tiktok-dark p-6 rounded-lg mb-8">
          <h3 className="text-xl font-bold mb-4">Usage</h3>
          
          <div className="mb-2 flex justify-between items-center">
            <span>Videos Created ({subscription.videosUsed} of {subscription.videosLimit})</span>
            <span>{Math.round((subscription.videosUsed / subscription.videosLimit) * 100)}%</span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-2.5">
            <div 
              className="bg-tiktok-pink h-2.5 rounded-full" 
              style={{ width: `${Math.min(100, (subscription.videosUsed / subscription.videosLimit) * 100)}%` }}
            ></div>
          </div>
        </div>
        
        {/* Payment History - Placeholder */}
        <div className="bg-tiktok-dark p-6 rounded-lg mb-8">
          <h3 className="text-xl font-bold mb-4">Payment History</h3>
          
          <div className="border-b border-gray-800 py-3 flex justify-between">
            <div>
              <p className="font-medium">{subscription.plan} Plan</p>
              <p className="text-gray-400 text-sm">
                {subscription.startDate 
                  ? new Date(subscription.startDate).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <span className="font-medium">
              ${subscription.billingCycle === 'yearly' 
                ? (subscription.planDetails?.yearlyPrice || '--')
                : (subscription.planDetails?.monthlyPrice || '--')}
            </span>
          </div>
          
          <div className="text-center py-4 text-gray-400 text-sm">
            Full payment history is available in your Stripe customer portal
          </div>
        </div>
        
        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-tiktok-dark p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Cancel Subscription?</h3>
              
              <p className="mb-6 text-gray-300">
                Your subscription will remain active until the end of your current billing period
                ({new Date(subscription.endDate).toLocaleDateString()}). After that, you'll be downgraded to the free plan.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 border border-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Keep Subscription
                </button>
                
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50"
                >
                  {cancelLoading ? 'Canceling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSubscription; 