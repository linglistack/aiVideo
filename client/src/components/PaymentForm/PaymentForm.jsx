import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  CardElement, 
  useStripe, 
  useElements, 
  PaymentRequestButtonElement 
} from '@stripe/react-stripe-js';
import { getPlans, createPaymentIntent, savePaymentMethod, getPaymentMethods, syncPaymentMethods } from '../../services/subscriptionService';
import { getCurrentUser, logout } from '../../services/authService';
import { FaPaypal, FaCreditCard, FaRegCreditCard, FaCcVisa, FaCcMastercard, FaCcAmex, FaCcDiscover } from 'react-icons/fa';

// Simple Radio component for selection UI
const Radio = ({ checked, onChange }) => {
  return (
    <div 
      className={`w-6 h-6 rounded-full flex items-center justify-center ${checked ? 'bg-white' : 'border-2 border-gray-500'}`}
      onClick={onChange}
    >
      {checked && (
        <div className="w-4 h-4 rounded-full bg-blue-500"></div>
      )}
    </div>
  );
};

const PaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [plan, setPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [paymentRequestSupported, setPaymentRequestSupported] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'paypal'
  const [isPaypalReady, setIsPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState(null);
  const [useSavedMethod, setUseSavedMethod] = useState(false);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  
  // Check authentication 
  useEffect(() => {
    const checkAuth = () => {
      const user = getCurrentUser();
      if (!user || !user.token) {
        setError('You need to be logged in to make a payment.');
        setAuthError(true);
        return false;
      }
      console.log('Auth check: User is logged in with token');
      return true;
    };
    
    checkAuth();
  }, []);
  
  // Load user's saved payment methods
  const loadSavedPaymentMethods = async () => {
    console.log('Loading saved payment methods...');
    setLoadingPaymentMethods(true);
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      console.log('No user found or user not logged in');
      setLoadingPaymentMethods(false);
      return;
    }

    // Initialize local methods array
    let localMethods = [];
    
    // First, get methods from local storage
    if (currentUser.paymentMethods && Array.isArray(currentUser.paymentMethods) && currentUser.paymentMethods.length > 0) {
      console.log('Found payment methods in user object:', currentUser.paymentMethods);
      localMethods = currentUser.paymentMethods;
    }

    // Always try to fetch from API as well to ensure we have the latest data
    try {
      console.log('Fetching payment methods from API...');
      console.log('User token available:', !!currentUser.token);
      
      const response = await getPaymentMethods();
      console.log('API response for payment methods:', response);
      
      if (response && response.success && response.methods) {
        if (response.methods.length > 0) {
          console.log('Successfully fetched payment methods from API:', response.methods);
          
          // Combine methods from API with local methods, removing duplicates
          // API methods take precedence
          const apiMethodIds = response.methods.map(m => m.id);
          const uniqueLocalMethods = localMethods.filter(m => !apiMethodIds.includes(m.id));
          const allMethods = [...response.methods, ...uniqueLocalMethods];
          
          // Update state with combined methods
          setSavedPaymentMethods(allMethods);
          
          // Find a default method to select
          let methodToSelect = null;
          
          // First check if user has a default payment method
          if (currentUser.paymentMethod) {
            console.log('Using default payment method from user object');
            methodToSelect = currentUser.paymentMethod;
          } 
          // Otherwise use the first method from the API
          else if (response.methods.length > 0) {
            console.log('Using first payment method from API as default');
            methodToSelect = response.methods[0];
          }
          
          if (methodToSelect) {
            setSelectedSavedMethod(methodToSelect);
            setUseSavedMethod(true);
          }
          
          // Update localStorage
          try {
            const updatedUser = { ...currentUser };
            updatedUser.paymentMethods = allMethods;
            
            // Set default payment method if needed
            if (!updatedUser.paymentMethod && allMethods.length > 0) {
              updatedUser.paymentMethod = methodToSelect || allMethods[0];
            }
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            console.log('Updated user object in localStorage with payment methods');
          } catch (storageError) {
            console.error('Error updating localStorage:', storageError);
          }
          
          setLoadingPaymentMethods(false);
          return;
        } else {
          console.log('No payment methods returned from API');
        }
      } else {
        console.log('API response unsuccessful or no methods returned');
      }
    } catch (error) {
      console.error('Error fetching payment methods from API:', error);
    }
    
    // If we reach here, we're using only local methods or API call failed
    if (localMethods.length > 0) {
      setSavedPaymentMethods(localMethods);
      
      // If user has a default payment method, pre-select it
      if (currentUser.paymentMethod) {
        setSelectedSavedMethod(currentUser.paymentMethod);
        setUseSavedMethod(true);
      } else {
        // Otherwise select the first available method
        setSelectedSavedMethod(localMethods[0]);
        setUseSavedMethod(true);
      }
    } else {
      // No methods available
      setSavedPaymentMethods([]);
      setSelectedSavedMethod(null);
      setUseSavedMethod(false);
    }
    
    setLoadingPaymentMethods(false);
  };
  
  // Add this function after loadSavedPaymentMethods function
  const syncWithStripe = async () => {
    setLoadingPaymentMethods(true);
    setError('');
    
    try {
      const response = await syncPaymentMethods();
      if (response.success) {
        setSavedPaymentMethods(response.methods || []);
        
        if (response.methods && response.methods.length > 0) {
          setSelectedSavedMethod(response.methods[0]);
          setUseSavedMethod(true);
        } else {
          setSelectedSavedMethod(null);
          setUseSavedMethod(false);
        }
        
        // Show success message
        setError(`Successfully synchronized with Stripe. ${response.message || ''}`);
      } else {
        setError(response.error || 'Failed to synchronize payment methods');
      }
    } catch (error) {
      console.error('Error syncing payment methods:', error);
      setError('Failed to synchronize payment methods with Stripe');
    } finally {
      setLoadingPaymentMethods(false);
    }
  };
  
  // Get plan ID and billing cycle from query params
  useEffect(() => {
    if (authError) return; // Don't fetch plans if auth failed
    
    const queryParams = new URLSearchParams(location.search);
    const planId = queryParams.get('plan');
    const cycle = queryParams.get('cycle');
    
    if (cycle === 'yearly' || cycle === 'monthly') {
      setBillingCycle(cycle);
    }
    
    // Load PayPal script
    const loadPaypalScript = () => {
      try {
        // Check if script is already loaded
        if (window.paypal) {
          setIsPaypalReady(true);
          return;
        }
        
        const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'sb';
        
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=subscription`;
        script.async = true;
        script.onload = () => {
          setIsPaypalReady(true);
        };
        script.onerror = (err) => {
          console.error('PayPal script loading error:', err);
          setPaypalError(`Failed to load PayPal: ${err.message || 'Unknown error'}`);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error setting up PayPal script:', error);
        setPaypalError(`PayPal setup error: ${error.message}`);
      }
    };
    
    loadPaypalScript();
    loadSavedPaymentMethods();
    
    // Fetch all available plans
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const result = await getPlans();
        
        if (result.success && result.plans) {
          setPlans(result.plans);
          
          // Find the selected plan or default to first plan
          if (planId) {
            const selectedPlan = result.plans.find(p => p._id === planId);
            if (selectedPlan) {
              setPlan(selectedPlan);
            } else {
              setPlan(result.plans[0]);
            }
          } else {
            setPlan(result.plans[0]);
          }
        } else {
          throw new Error('Failed to load plans');
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        setError('Failed to load plan details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, [location, authError]);
  
  useEffect(() => {
    if (savedPaymentMethods.length > 0) {
      console.log('Saved payment methods loaded:', savedPaymentMethods.length, 'methods available');
      console.log('First payment method details:', JSON.stringify(savedPaymentMethods[0], null, 2));
      savedPaymentMethods.forEach((method, index) => {
        console.log(`Method ${index + 1}:`, 
          method.type, 
          method.last4 || method.card?.last4, 
          method.id,
          method.expMonth || method.card?.exp_month,
          method.expYear || method.card?.exp_year
        );
      });
    }
  }, [savedPaymentMethods]);
  
  // Setup PayPal when it's selected and ready
  useEffect(() => {
    if (paymentMethod === 'paypal' && isPaypalReady && plan && window.paypal) {
      try {
        const price = billingCycle === 'monthly' 
          ? plan.monthlyPrice
          : plan.yearlyPrice;
        
        const paypalContainer = document.getElementById('paypal-button-container');
        if (!paypalContainer) {
          console.error('PayPal container not found');
          return;
        }
        
        // Clear the container first
        paypalContainer.innerHTML = '';
        
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'black',
            shape: 'rect',
            label: 'pay'
          },
          createOrder: async (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: price.toFixed(2),
                  currency_code: 'USD'
                },
                description: `${plan.name} Plan (${billingCycle})`
              }]
            });
          },
          onApprove: async (data, actions) => {
            setProcessing(true);
            
            try {
              // Mock saving the payment method info
              await savePaymentMethod({
                type: 'paypal',
                email: getCurrentUser().email,
                brand: 'paypal',
                last4: 'PayPal'
              });
              
              navigate('/payment-success');
            } catch (error) {
              console.error('PayPal payment error:', error);
              setError('Something went wrong processing your PayPal payment.');
            } finally {
              setProcessing(false);
            }
          },
          onError: (err) => {
            console.error('PayPal error:', err);
            setError('PayPal encountered an error. Please try a different payment method.');
          }
        }).render('#paypal-button-container').catch(err => {
          console.error('PayPal render error:', err);
        });
      } catch (error) {
        console.error('Error setting up PayPal:', error);
      }
    }
  }, [paymentMethod, isPaypalReady, plan, billingCycle, navigate]);
  
  // Setup Apple Pay / Google Pay
  useEffect(() => {
    if (stripe && plan) {
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label: `${plan.name} Plan (${billingCycle})`,
          amount: billingCycle === 'monthly' 
            ? Math.round(plan.monthlyPrice * 100) 
            : Math.round(plan.yearlyPrice * 100),
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      
      // Check if device supports payment request
      pr.canMakePayment().then(result => {
        if (result) {
          setPaymentRequest(pr);
          setPaymentRequestSupported(true);
        } else {
          setPaymentRequestSupported(false);
        }
      });
      
      // Handle payment request completion
      pr.on('paymentmethod', async (ev) => {
        setProcessing(true);
        
        try {
          const priceId = billingCycle === 'monthly' 
            ? plan.monthlyPriceId 
            : plan.yearlyPriceId;
          
          const result = await createPaymentIntent({
            priceId,
            paymentMethodId: ev.paymentMethod.id,
            billingCycle
          });
          
          if (result.success) {
            // If subscription is active, confirm payment
            if (result.subscription.status === 'active') {
              ev.complete('success');
              navigate('/payment-success');
            } 
            // If additional actions are required
            else if (result.subscription.latest_invoice.payment_intent) {
              const { client_secret, status } = result.subscription.latest_invoice.payment_intent;
              
              if (status === 'requires_action') {
                const { error: confirmError } = await stripe.confirmCardPayment(client_secret);
                
                if (confirmError) {
                  ev.complete('fail');
                  setError('Payment failed. Please try again with a different payment method.');
                } else {
                  ev.complete('success');
                  navigate('/payment-success');
                }
              } else {
                ev.complete('success');
                navigate('/payment-success');
              }
            } else {
              ev.complete('success');
              navigate('/payment-success');
            }
          } else {
            ev.complete('fail');
            setError(result.error || 'Payment failed. Please try again.');
          }
        } catch (error) {
          console.error('Payment error:', error);
          ev.complete('fail');
          setError('Something went wrong with your payment. Please try again.');
        } finally {
          setProcessing(false);
        }
      });
    }
  }, [stripe, plan, billingCycle, navigate]);
  
  const cardStyle = {
    style: {
      base: {
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#606060',
        },
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
  };
  
  // Helper function to render card brand icon
  const getCardBrandIcon = (brand) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return <FaCcVisa className="text-xl" />;
      case 'mastercard':
        return <FaCcMastercard className="text-xl" />;
      case 'amex':
        return <FaCcAmex className="text-xl" />;
      case 'discover':
        return <FaCcDiscover className="text-xl" />;
      default:
        return <FaCreditCard className="text-xl" />;
    }
  };

  // Handle saved method selection
  const handleSavedMethodSelect = (method) => {
    setSelectedSavedMethod(method);
    setUseSavedMethod(true);
  };

  // Toggle between saved and new payment methods
  const toggleUseSavedMethod = () => {
    setUseSavedMethod(!useSavedMethod);
    // Always display all saved methods when toggling to saved methods view
    if (!useSavedMethod && savedPaymentMethods.length > 0) {
      // Select first method if none is currently selected
      if (!selectedSavedMethod) {
        setSelectedSavedMethod(savedPaymentMethods[0]);
      }
    }
  };
  
  // Helper function to normalize payment method data
  const normalizePaymentMethod = (method) => {
    // For debugging
    console.log('Normalizing method:', method);
    
    // Default values
    const normalized = {
      id: method.id,
      type: method.type || 'card',
      brand: '',
      last4: '****',
      expMonth: null,
      expYear: null
    };
    
    // Handle nested card object
    if (method.card) {
      normalized.type = 'card';
      normalized.brand = method.card.brand || '';
      normalized.last4 = method.card.last4 || '****';
      normalized.expMonth = method.card.exp_month;
      normalized.expYear = method.card.exp_year;
    } 
    // Handle flat structure
    else {
      normalized.brand = method.brand || '';
      normalized.last4 = method.last4 || '****';
      normalized.expMonth = method.expMonth;
      normalized.expYear = method.expYear;
    }
    
    return normalized;
  };
  
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setProcessing(true);
    setError('');
    
    // Check authentication before processing payment
    const user = getCurrentUser();
    if (!user || !user.token) {
      setError('Authentication error: You need to be logged in to make a payment.');
      setProcessing(false);
      return;
    }
    
    if (!stripe || !elements || !plan) {
      setProcessing(false);
      return;
    }
    
    try {
      let paymentMethodId;
      
      // If using a saved payment method
      if (useSavedMethod && selectedSavedMethod) {
        console.log('Using saved payment method:', selectedSavedMethod);
        paymentMethodId = selectedSavedMethod.id;
        
        // Verify that the payment method ID is valid (begins with pm_)
        if (!paymentMethodId || !paymentMethodId.startsWith('pm_')) {
          console.error('Invalid payment method ID format:', paymentMethodId);
          setError('The saved payment method appears to be invalid. Please try using a new card instead.');
          setUseSavedMethod(false);
          setProcessing(false);
          return;
        }
      } else {
        // Create payment method
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: elements.getElement(CardElement),
        });
        
        if (error) {
          setError(error.message);
          setProcessing(false);
          return;
        }
        
        console.log('Payment method created:', paymentMethod.id);
        paymentMethodId = paymentMethod.id;
        
        // Automatically save this new payment method for future use
        if (paymentMethod && paymentMethod.id && paymentMethod.card) {
          try {
            await savePaymentMethod({
              id: paymentMethod.id,
              type: 'card',
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year
            });
            console.log('New payment method saved for future use');
          } catch (saveError) {
            console.error('Error saving payment method:', saveError);
            // Continue with payment even if saving failed
          }
        }
      }
      
      // Create subscription with the payment method
      const priceId = billingCycle === 'monthly' 
        ? plan.monthlyPriceId
        : plan.yearlyPriceId;
      
      console.log('Creating payment intent with:', {
        priceId,
        paymentMethodId,
        billingCycle
      });
      
      const result = await createPaymentIntent({
        priceId,
        paymentMethodId,
        billingCycle,
        saveMethod: !useSavedMethod // Only save if not using a saved method
      });
      
      // Handle subscription status
      if (result.success) {
        console.log('Payment successful:', result);
        if (result.subscription.status === 'active') {
          navigate('/payment-success');
        } 
        else if (result.subscription.latest_invoice?.payment_intent) {
          const { client_secret, status } = result.subscription.latest_invoice.payment_intent;
          
          if (status === 'requires_action') {
            // 3D Secure is required
            const { error: confirmError } = await stripe.confirmCardPayment(client_secret);
            
            if (confirmError) {
              console.error('Confirmation error:', confirmError);
              setError('Payment failed. Please try with a different payment method.');
            } else {
              navigate('/payment-success');
            }
          } else {
            navigate('/payment-success');
          }
        } else {
          navigate('/payment-success');
        }
      } else {
        console.error('Payment failed:', result);
        
        // Handle specific Stripe errors
        if (result.error && (
            result.error.includes('No such PaymentMethod') || 
            result.error.includes('The payment method') ||
            result.error.includes('pm_'))) {
          setError('The saved payment method is no longer valid or has expired. Please use a new payment method.');
          setUseSavedMethod(false); // Switch to new payment method input
        } else {
          setError(result.error || 'Subscription creation failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Specific error message for auth issues
      if (error.response?.status === 401 || error.message?.includes('Not authorized')) {
        setError('Authentication error: Your session may have expired. Please try logging out and back in, then try again.');
      } else if (error.message?.includes('No such PaymentMethod') || error.message?.includes('payment_method')) {
        setError('The saved payment method is no longer valid or has expired. Please use a new payment method.');
        setUseSavedMethod(false); // Switch to new payment method input
      } else {
        setError('Something went wrong with your payment. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };
  
  // Handle logout and redirect to login
  const handleRelogin = () => {
    // Store the current plan in localStorage so we can retrieve it after login
    if (plan && plan._id) {
      localStorage.setItem('pendingPlanUpgrade', plan._id);
      localStorage.setItem('pendingBillingCycle', billingCycle);
    }
    
    // Use the logout function with redirect URL
    logout('/login?return_to=' + encodeURIComponent('/payment'));
  };
  
  if (loading || !plan) {
    return (
      <div className="bg-black min-h-screen text-white py-12">
        <div className="container mx-auto px-4 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink mx-auto"></div>
          <p className="mt-4">Loading payment details...</p>
        </div>
      </div>
    );
  }
  
  // If we have an auth error, show a special message
  if (authError) {
    return (
      <div className="bg-black min-h-screen text-white py-12">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-tiktok-dark p-6 rounded-lg text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
            <p className="text-gray-400 mb-6">
              Your session may have expired or you're not properly logged in. 
              Please log in again to continue with your payment.
            </p>
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleRelogin}
                className="bg-tiktok-pink text-white py-3 px-6 rounded-md font-semibold hover:bg-opacity-90 transition-all"
              >
                Log In Again
              </button>
              <Link to="/pricing" className="text-tiktok-pink hover:underline">
                Return to Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-black min-h-screen text-white py-12">
      <div className="container mx-auto px-4 max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Complete Your Purchase</h1>
        
        <div className="bg-tiktok-dark p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold mb-4">{plan.name} Plan</h2>
          <p className="text-gray-400 mb-4">{plan.description}</p>
          
          <div className="flex justify-between mb-6">
            <span>Billing</span>
            <div className="flex items-center">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`text-sm px-2 py-1 rounded ${
                  billingCycle === 'monthly' ? 'bg-tiktok-pink' : 'bg-gray-800'
                }`}
              >
                Monthly
              </button>
              <span className="mx-2">|</span>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`text-sm px-2 py-1 rounded ${
                  billingCycle === 'yearly' ? 'bg-tiktok-pink' : 'bg-gray-800'
                } flex items-center`}
              >
                Yearly
                <span className="ml-1 text-xs bg-green-500 px-1 rounded">-20%</span>
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-4 mb-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}</span>
            </div>
            
            {billingCycle === 'yearly' && (
              <div className="flex justify-between mb-2 text-green-500">
                <span>Yearly discount (20%)</span>
                <span>-${(plan.monthlyPrice * 12 * 0.2).toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Total</span>
              <span>
                ${billingCycle === 'monthly' 
                  ? plan.monthlyPrice.toFixed(2) 
                  : plan.yearlyPrice.toFixed(2)}
                <span className="text-sm text-gray-400 ml-1">
                  /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                </span>
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-tiktok-dark p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-6">Payment Method</h3>
          
          {/* Saved Payment Methods */}
          {savedPaymentMethods.length > 0 ? (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Your Payment Methods ({savedPaymentMethods.length})</h4>
                <div className="flex items-center space-x-3">
                  {/* <button 
                    onClick={() => syncWithStripe()}
                    className="text-sm text-gray-400 hover:text-white"
                    title="Sync with Stripe to fix invalid payment methods"
                    disabled={loadingPaymentMethods}
                  >
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Sync
                    </span>
                  </button>
                  <button 
                    onClick={() => loadSavedPaymentMethods()}
                    className="text-sm text-gray-400 hover:text-white"
                    title="Refresh payment methods"
                    disabled={loadingPaymentMethods}
                  >
                    {loadingPaymentMethods ? (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button> */}
                  <button 
                    onClick={toggleUseSavedMethod}
                    className="text-sm text-tiktok-pink hover:underline"
                    disabled={loadingPaymentMethods}
                  >
                    {useSavedMethod ? 'Use New Method' : 'Use Saved Method'}
                  </button>
                </div>
              </div>
              
              {/* Always show all saved methods when using saved method option */}
              {useSavedMethod && (
                <div className="space-y-2 mb-4">
                  {loadingPaymentMethods ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tiktok-pink mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-400">Loading payment methods...</p>
                    </div>
                  ) : (
                    savedPaymentMethods.map((rawMethod) => {
                      // Normalize the payment method data for consistent display
                      const method = normalizePaymentMethod(rawMethod);
                      
                      return (
                        <div
                          key={method.id}
                          className={`bg-gray-800 rounded-md p-4 min-h-[70px] flex items-center cursor-pointer ${
                            selectedSavedMethod && selectedSavedMethod.id === method.id
                              ? 'border border-red-500'
                              : ''
                          }`}
                          onClick={() => {
                            setSelectedSavedMethod(rawMethod); // Keep the original object for API calls
                            setUseSavedMethod(true);
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-4">
                              {/* Brand icon */}
                              <div className="w-10 h-10 bg-gray-700 rounded-md flex items-center justify-center">
                                {method.type === 'card' ? (
                                  getCardBrandIcon(method.brand)
                                ) : method.type === 'paypal' ? (
                                  <FaPaypal className="text-xl" />
                                ) : (
                                  <FaCreditCard className="text-xl" />
                                )}
                              </div>
                              
                              {/* Card details */}
                              <div>
                                <div className="text-white font-medium">
                                  {method.type === 'card' ? (
                                    <>•••• {method.last4}</>
                                  ) : method.type === 'paypal' ? (
                                    'PayPal Account'
                                  ) : (
                                    'Payment Method'
                                  )}
                                </div>
                                
                                {/* Show expiration date if available */}
                                {method.type === 'card' && method.expMonth && method.expYear && (
                                  <div className="text-sm text-gray-400">
                                    Expires {method.expMonth < 10 ? '0' : ''}{method.expMonth}/{method.expYear.toString().slice(-2)}
                                  </div>
                                )}
                                
                                {/* PayPal email */}
                                {method.type === 'paypal' && method.email && (
                                  <div className="text-sm text-gray-400">{method.email}</div>
                                )}
                              </div>
                            </div>
                            
                            {/* Radio selection */}
                            <div>
                              <Radio
                                checked={selectedSavedMethod && selectedSavedMethod.id === method.id}
                                onChange={() => {
                                  setSelectedSavedMethod(rawMethod); // Keep the original object for API calls
                                  setUseSavedMethod(true);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 text-sm text-gray-400">
              No saved payment methods found. Please enter your payment details below.
            </div>
          )}
          
          {/* If using saved method, just show a button. Otherwise, show payment options */}
          {useSavedMethod && selectedSavedMethod ? (
            // Payment Button for Saved Method
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="text-red-500 mb-4 text-sm">{error}</div>
              )}
              
              <button
                disabled={processing}
                className="w-full bg-tiktok-pink text-white py-3 px-6 rounded-md font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Pay $${billingCycle === 'monthly' 
                    ? plan.monthlyPrice.toFixed(2) 
                    : plan.yearlyPrice.toFixed(2)} with saved ${selectedSavedMethod.type === 'paypal' ? 'PayPal' : 'card'}`
                )}
              </button>
            </form>
          ) : (
            <>
              {/* Payment Method Selector */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                      paymentMethod === 'card' 
                        ? 'bg-tiktok-pink text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <FaRegCreditCard className="text-2xl mb-2" />
                    <span className="text-xs">Card</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                      paymentMethod === 'paypal' 
                        ? 'bg-tiktok-pink text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <FaPaypal className="text-2xl mb-2" />
                    <span className="text-xs">PayPal</span>
                  </button>
                </div>
              </div>
              
              {/* Apple Pay / Google Pay Button */}
              {paymentRequestSupported && paymentRequest && (
                <div className="mb-6">
                  <label className="block text-sm mb-2">Express Checkout</label>
                  <PaymentRequestButtonElement
                    options={{
                      paymentRequest,
                      style: {
                        paymentRequestButton: {
                          theme: 'dark',
                          height: '44px',
                        },
                      },
                    }}
                  />
                  <div className="text-center text-gray-500 text-sm mt-2">
                    <span>Or pay with card</span>
                  </div>
                </div>
              )}
              
              {/* PayPal Component */}
              {paymentMethod === 'paypal' && (
                <div className="mb-6">
                  <div id="paypal-button-container" className="min-h-[44px] bg-gray-800 rounded-md flex items-center justify-center">
                    {!isPaypalReady && (
                      <p className="text-gray-400 text-sm">Loading PayPal...</p>
                    )}
                  </div>
                  {paypalError && (
                    <p className="text-red-500 text-sm mt-2">{paypalError}</p>
                  )}
                </div>
              )}
              
              {/* Card Element */}
              {paymentMethod === 'card' && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm mb-2">Card Details</label>
                    <div className="bg-black border border-gray-800 p-4 rounded-md">
                      <CardElement options={cardStyle} />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="text-red-500 mb-4 text-sm">{error}</div>
                  )}
                  
                  <button
                    disabled={processing || !stripe}
                    className="w-full bg-tiktok-pink text-white py-3 px-6 rounded-md font-semibold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Pay $${billingCycle === 'monthly' 
                        ? plan.monthlyPrice.toFixed(2) 
                        : plan.yearlyPrice.toFixed(2)}`
                    )}
                  </button>
                </form>
              )}
            </>
          )}
          
          <p className="text-center text-sm text-gray-400 mt-4">
            Your subscription will automatically renew each {billingCycle === 'monthly' ? 'month' : 'year'}.
            You can cancel anytime.
          </p>
          
          <div className="mt-6 flex justify-center space-x-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Visa.svg/1200px-Visa.svg.png" alt="Visa" className="h-8 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1200px-Mastercard-logo.svg.png" alt="Mastercard" className="h-8 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png" alt="Amex" className="h-8 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/1200px-PayPal.svg.png" alt="PayPal" className="h-8 opacity-60" />
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Secure payment processing by Stripe</p>
            <p className="mt-1">Your payment information is encrypted and secure</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm; 