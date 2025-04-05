import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, createCheckoutSession } from '../../services/subscriptionService';
import { getCurrentUser } from '../../services/authService';

const Pricing = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const user = getCurrentUser();
  
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await getPlans();
        if (response.success) {
          setPlans(response.plans);
        } else {
          throw new Error(response.error || 'Failed to load plans');
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, []);
  
  const handleSubscribe = async (plan) => {
    // If user is not logged in, redirect to login
    if (!user) {
      navigate('/login?return_to=/pricing');
      return;
    }
    
    try {
      setProcessingPlanId(plan._id);
      setError(null); // Clear any previous errors
      
      // For direct payment form rather than Stripe Checkout
      console.log(`Redirecting to payment form for plan: ${plan.name} (ID: ${plan._id})`);
      navigate(`/payment?plan=${plan._id}&cycle=${billingCycle}`);
      
      // The code below is for Stripe Checkout - commented out since we're using our custom form
      /*
      const priceId = billingCycle === 'monthly' ? plan.monthlyPriceId : plan.yearlyPriceId;
      
      console.log('Creating checkout session for price:', priceId);
      const response = await createCheckoutSession({ priceId, billingCycle });
      
      if (response.success && response.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.url;
      } else if (response.redirect) {
        // Handle auth redirect
        navigate(response.redirect);
      } else {
        // Show error message
        setError(response.error || 'Failed to create checkout session');
      }
      */
    } catch (error) {
      console.error('Error navigating to payment form:', error);
      // Extract the most useful error message
      let errorMessage = 'Something went wrong. Please try again or log out and back in.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setProcessingPlanId(null);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white min-h-screen py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading plans...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white min-h-screen py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-16 text-gray-900">Choose your plan</h1>
        
        {/* Billing toggle - hiding this based on the image you provided */}
        {/* <div className="flex justify-center mb-10">
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md ${
                billingCycle === 'monthly' ? 'bg-blue-500 text-white' : 'text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md flex items-center ${
                billingCycle === 'yearly' ? 'bg-blue-500 text-white' : 'text-gray-700'
              }`}
            >
              Yearly
              <span className="ml-2 bg-green-500 text-xs px-2 py-1 rounded-full text-white">
                20% off
              </span>
            </button>
          </div>
        </div> */}
        
        {/* Plans grid - styled to match the image */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`border ${plan.isPopular ? 'border-blue-500' : 'border-gray-200'} rounded-lg p-6 flex flex-col relative ${plan.isPopular ? 'shadow-lg' : ''}`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">{plan.name}</h2>
              
              <div className="mb-6 text-center">
                <span className="text-5xl font-bold text-gray-900">
                  ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                <span className="text-gray-600 ml-1">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
              
              <div className="text-center mb-6 text-gray-700">
                {billingCycle === 'monthly' ? plan.videosLimit : plan.videosLimit * 12} videos per {billingCycle === 'monthly' ? 'month' : 'year'}
              </div>
              
              <div className="border-t border-gray-200 my-4"></div>
              
              <div className="flex-grow">
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <span className="text-gray-900 inline-block w-6">🎥</span>
                    <span className="ml-2 text-gray-700">{plan.videosLimit} videos per month</span>
                  </li>
                  
                  <li className="flex items-start">
                    <span className="text-gray-900 inline-block w-6">👤</span>
                    <span className="ml-2 text-gray-700">All 200+ UGC avatars</span>
                  </li>
                  
                  <li className="flex items-start">
                    <span className="text-gray-900 inline-block w-6">✨</span>
                    <span className="ml-2 text-gray-700">Generate <span className="font-medium">unlimited</span> viral hooks</span>
                  </li>
                  
                  <li className="flex items-start">
                    <span className="text-gray-900 inline-block w-6">👤</span>
                    <span className="ml-2 text-gray-700">
                      Create your own AI avatars
                      {plan.name === 'Starter' && ' (25 images and 5 videos)'}
                      {plan.name === 'Growth' && ' (100 images and 25 videos)'}
                      {plan.name === 'Scale' && ' (200 images and 50 videos)'}
                    </span>
                  </li>
                  
                  <li className="flex items-start">
                    {plan.name !== 'Starter' ? (
                      <>
                        <span className="text-gray-900 inline-block w-6">🔄</span>
                        <span className="ml-2 text-gray-700">Publish to TikTok</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400 inline-block w-6">❌</span>
                        <span className="ml-2 text-gray-400">Publish to TikTok</span>
                      </>
                    )}
                  </li>
                  
                  <li className="flex items-start">
                    {plan.name !== 'Starter' ? (
                      <>
                        <span className="text-gray-900 inline-block w-6">⏱️</span>
                        <span className="ml-2 text-gray-700">Schedule/automate videos</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400 inline-block w-6">❌</span>
                        <span className="ml-2 text-gray-400">Schedule/automate videos</span>
                      </>
                    )}
                  </li>
                </ul>
              </div>
              
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={processingPlanId === plan._id}
                className={`w-full py-3 px-6 rounded-full font-semibold text-center transition-all ${
                  plan.isPopular 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                } disabled:opacity-70`}
              >
                {processingPlanId === plan._id ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="max-w-4xl mx-auto mb-6 px-4">
            <div className="bg-red-900 bg-opacity-30 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center">
              {error}
              <button 
                onClick={() => setError(null)} 
                className="ml-4 text-red-300 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;