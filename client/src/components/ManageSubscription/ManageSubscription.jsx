import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSubscriptionStatus, cancelSubscription, getPlans, createBillingPortalSession } from '../../services/subscriptionService';

const ManageSubscription = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('Fetching subscription data...');
        
        // Fetch subscription and plans in parallel
        const [subscriptionResponse, plansResponse] = await Promise.all([
          getSubscriptionStatus().catch(err => {
            console.error('Error in getSubscriptionStatus:', err);
            return { success: false, error: err.message || 'Failed to fetch subscription' };
          }),
          getPlans().catch(err => {
            console.error('Error in getPlans:', err);
            return { success: false, error: err.message || 'Failed to fetch plans' };
          })
        ]);
        
        console.log('Subscription response:', subscriptionResponse);
        console.log('Plans response:', plansResponse);
        
        if (subscriptionResponse.success) {
          setSubscription(subscriptionResponse.subscription);
        } else {
          console.error('Subscription response unsuccessful:', subscriptionResponse.error);
          // Create a default free subscription object
          setSubscription({
            plan: 'starter',
            isActive: true,
            videosUsed: 0,
            videosLimit: 10,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
          });
        }
        
        if (plansResponse.success) {
          setPlans(plansResponse.plans);
        } else {
          console.error('Plans response unsuccessful:', plansResponse.error);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        setError('Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const handleCancelSubscription = async () => {
    if (!selectedReason && !otherReason) {
      alert('Please select a reason for cancellation');
      return;
    }
    
    try {
      setCancelLoading(true);
      
      // In a real app, you might want to send the cancellation reason to the server
      const cancellationData = {
        reason: selectedReason === 'other' ? otherReason : selectedReason
      };
      
      const response = await cancelSubscription(cancellationData);
      
      if (!response.success) {
        // Handle auth errors specifically
        if (response.error && response.error.includes('session has expired')) {
          setError('Your session has expired. Please log in again.');
          // Optionally redirect to login
          // window.location.href = '/login?return_to=/account/subscription';
          return;
        }
        
        throw new Error(response.error || 'Failed to cancel subscription');
      }
      
      // Update subscription status in local state with all necessary cancellation flags
      if (response.subscription) {
        setSubscription({
          ...subscription,
          ...response.subscription,
          cancelAtPeriodEnd: true,
          isCanceled: true,
          canceledAt: new Date().toISOString()
        });
      } else {
        // If subscription data is not provided in the response, update the necessary flags manually
        setSubscription({
          ...subscription,
          cancelAtPeriodEnd: true,
          isCanceled: true,
          canceledAt: new Date().toISOString()
        });
      }
      
      setShowCancelConfirm(false);
      setError(''); // Clear any previous errors
      
      // Show success message
      alert('Your subscription has been canceled. You will continue to have access until your billing period ends.');
      
    } catch (error) {
      console.error('Error canceling subscription:', error);
      setError(error.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleChangePlan = (planId) => {
    // Navigate to payment page with selected plan
    navigate(`/payment?plan=${planId}&change=true`);
  };

  // Handle redirect to billing portal
  const handleUpdateBilling = async () => {
    try {
      setBillingLoading(true);
      setError('');
      
      const response = await createBillingPortalSession();
      
      if (response.success && response.url) {
        // Redirect to Stripe Billing Portal
        window.location.href = response.url;
      } else {
        throw new Error(response.error || 'Failed to access billing portal');
      }
    } catch (err) {
      console.error('Error accessing billing portal:', err);
      setError('Failed to access billing portal. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  };
  
  // Handle subscription render UI based on subscription status
  const renderSubscriptionActions = () => {
    // If the subscription doesn't exist or is completely inactive, show Upgrade button
    if (!subscription || (!subscription.isActive && subscription.plan === 'free')) {
      return (
        <div className="flex space-x-4">
          <Link
            to="/pricing"
            className="bg-gradient-to-r from-blue-500 to-tiktok-pink text-white px-4 py-2 rounded-md hover:opacity-90 transition-colors flex-1 text-center"
          >
            Upgrade Plan
          </Link>
        </div>
      );
    }
    
    // If subscription is canceled but still active until period end
    // Check both cancelAtPeriodEnd and isCanceled flags since either could be set
    if (subscription.cancelAtPeriodEnd || subscription.isCanceled) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
          <p className="text-red-400 mb-2">
            <span className="font-medium">Your subscription has been canceled</span> but you still have access until {new Date(subscription.endDate).toLocaleDateString()}.
          </p>
          <div className="flex space-x-4 mt-4">
            <Link
              to="/pricing"
              className="bg-gradient-to-r from-blue-500 to-tiktok-pink text-white px-4 py-2 rounded-md hover:opacity-90 transition-colors flex-1 text-center"
            >
              Resubscribe
            </Link>
          </div>
        </div>
      );
    }
    
    // Otherwise show normal actions for active subscription
    return (
      <div className="flex space-x-4">
        <button
          onClick={() => setShowChangePlan(true)}
          className="bg-gradient-to-r from-blue-500 to-tiktok-pink text-white px-4 py-2 rounded-md hover:opacity-90 transition-colors flex-1"
        >
          Change Plan
        </button>
        
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex-1"
        >
          Cancel
        </button>
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="bg-black min-h-screen text-white py-12 pt-0">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink mx-auto"></div>
          <p className="mt-4">Loading subscription details...</p>
        </div>
      </div>
    );
  }
  
  if (!subscription) {
    return (
      <div className="bg-black min-h-screen text-white py-12 pt-0">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <div className="bg-tiktok-dark p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-bold mb-4">No Active Subscription</h2>
            <p className="text-gray-400 mb-6">You don't have an active subscription yet.</p>
            <Link
              to="/pricing"
              className="bg-tiktok-pink text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-colors inline-block"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-black min-h-screen text-white py-12 pt-0">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Subscription</h1>
          <Link to="/account" className="text-tiktok-pink hover:underline">
            &larr; Back to Account
          </Link>
        </div>
        
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
            
            {renderSubscriptionActions()}
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
          
          <div className="mt-6 text-center">
            <button 
              onClick={handleUpdateBilling}
              disabled={billingLoading}
              className="border border-gray-600 px-4 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {billingLoading ? 'Loading...' : 'Update Billing Information'}
            </button>
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
          
          {subscription.videosUsed >= subscription.videosLimit && (
            <div className="mt-3 text-yellow-400 text-sm">
              You've reached your video limit for this billing cycle. 
              {subscription.plan !== 'scale' && (
                <Link to="/pricing" className="ml-1 underline">Upgrade your plan</Link>
              )}
            </div>
          )}
        </div>
        
        {/* Payment History Section */}
        <div className="bg-tiktok-dark p-6 rounded-lg mb-8">
          <h3 className="text-xl font-bold mb-4">Payment History</h3>
          
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Invoice
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 bg-opacity-50 divide-y divide-gray-800">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(subscription.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    ${subscription.billingCycle === 'yearly' 
                      ? subscription.planDetails?.yearlyPrice || 'N/A'
                      : subscription.planDetails?.monthlyPrice || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Paid
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-tiktok-pink hover:underline">
                    View
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-center">
            <button className="border border-gray-600 px-4 py-2 rounded-md hover:bg-gray-800 transition-colors">
              View All Transactions
            </button>
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
              
              <div className="space-y-4 mb-6">
                <p className="text-sm font-medium text-gray-300 mb-2">
                  Please tell us why you're canceling:
                </p>
                
                <div className="flex items-start">
                  <input
                    id="reason-value"
                    name="cancel-reason"
                    type="radio"
                    value="not-enough-value"
                    checked={selectedReason === "not-enough-value"}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 focus:ring-tiktok-pink h-4 w-4 text-tiktok-pink border-gray-600"
                  />
                  <label htmlFor="reason-value" className="ml-3 text-sm font-medium text-gray-300">
                    I didn't get enough value from the service
                  </label>
                </div>
                
                <div className="flex items-start">
                  <input
                    id="reason-price"
                    name="cancel-reason"
                    type="radio"
                    value="too-expensive"
                    checked={selectedReason === "too-expensive"}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 focus:ring-tiktok-pink h-4 w-4 text-tiktok-pink border-gray-600"
                  />
                  <label htmlFor="reason-price" className="ml-3 text-sm font-medium text-gray-300">
                    The service is too expensive
                  </label>
                </div>
                
                <div className="flex items-start">
                  <input
                    id="reason-alternative"
                    name="cancel-reason"
                    type="radio"
                    value="found-alternative"
                    checked={selectedReason === "found-alternative"}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 focus:ring-tiktok-pink h-4 w-4 text-tiktok-pink border-gray-600"
                  />
                  <label htmlFor="reason-alternative" className="ml-3 text-sm font-medium text-gray-300">
                    I found a better alternative
                  </label>
                </div>
                
                <div className="flex items-start">
                  <input
                    id="reason-other"
                    name="cancel-reason"
                    type="radio"
                    value="other"
                    checked={selectedReason === "other"}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 focus:ring-tiktok-pink h-4 w-4 text-tiktok-pink border-gray-600"
                  />
                  <label htmlFor="reason-other" className="ml-3 text-sm font-medium text-gray-300">
                    Other reason
                  </label>
                </div>
                
                {selectedReason === "other" && (
                  <div className="ml-7">
                    <textarea
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      className="bg-gray-900 text-white rounded-lg w-full p-3 focus:ring-2 focus:ring-tiktok-pink focus:outline-none"
                      placeholder="Please tell us more..."
                      rows={3}
                    ></textarea>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 border border-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
                >
                  Keep Subscription
                </button>
                
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50"
                >
                  {cancelLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Canceling...
                    </span>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Change Plan Modal */}
        {showChangePlan && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-tiktok-dark p-6 rounded-lg max-w-3xl w-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Change Your Plan</h3>
                <button 
                  onClick={() => setShowChangePlan(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-300 mb-6">
                You can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated difference immediately.
                If you downgrade, your new plan will take effect at the end of your current billing cycle.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {plans.map(plan => (
                  <div 
                    key={plan._id} 
                    className={`border rounded-lg p-4 ${
                      plan.name.toLowerCase() === subscription.plan
                        ? 'border-tiktok-pink'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-bold">{plan.name}</h4>
                      {plan.name.toLowerCase() === subscription.plan && (
                        <span className="bg-tiktok-pink text-white text-xs px-2 py-1 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <p className="text-2xl font-bold mb-2">
                      ${subscription.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}
                      <span className="text-sm text-gray-400">/{subscription.billingCycle === 'yearly' ? 'year' : 'month'}</span>
                    </p>
                    
                    <p className="text-gray-400 mb-4">{plan.videosLimit} videos/month</p>
                    
                    <button
                      onClick={() => handleChangePlan(plan._id)}
                      disabled={plan.name.toLowerCase() === subscription.plan}
                      className={`w-full py-2 rounded-md ${
                        plan.name.toLowerCase() === subscription.plan
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-tiktok-pink text-white hover:bg-opacity-90'
                      }`}
                    >
                      {plan.name.toLowerCase() === subscription.plan
                        ? 'Current Plan'
                        : plan.name.toLowerCase() === 'starter' && subscription.plan !== 'free'
                          ? 'Downgrade'
                          : 'Upgrade'
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Help Section */}
        <div className="bg-tiktok-dark p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-4">Need Help?</h3>
          <p className="text-gray-400 mb-4">
            If you have any questions about your subscription or billing, our support team is here to help.
          </p>
          <div className="flex space-x-4">
            <Link to="/support" className="text-tiktok-pink hover:underline">
              Contact Support
            </Link>
            <Link to="/faq" className="text-tiktok-pink hover:underline">
              Billing FAQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageSubscription;