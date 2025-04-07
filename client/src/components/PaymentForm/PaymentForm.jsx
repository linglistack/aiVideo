import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  CardElement, 
  useStripe, 
  useElements, 
  PaymentRequestButtonElement 
} from '@stripe/react-stripe-js';
import { getPlans, createPaymentIntent, savePaymentMethod, getPaymentMethods, syncPaymentMethods, setDefaultPaymentMethod } from '../../services/subscriptionService';
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
  const [upgradeDetails, setUpgradeDetails] = useState(null);
  const [calculatingProration, setCalculatingProration] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [savePaymentInfo, setSavePaymentInfo] = useState(true);
  
  // Add a ref to track PayPal script loading status
  const paypalScriptLoaded = useRef(false);
  
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

    try {
      console.log('Fetching payment methods from API...');
      console.log('User token available:', !!currentUser.token);
      
      const response = await getPaymentMethods();
      console.log('API response for payment methods:', response);
      
      if (response && response.success && response.methods) {
        if (response.methods.length > 0) {
          console.log('Successfully fetched payment methods from API:', response.methods);
          
          // Debug logging for isDefault property
          response.methods.forEach((method, index) => {
            console.log(`Payment method ${index + 1} (${method.id}) isDefault:`, method.isDefault);
          });
          
          // Update state with methods directly from API
          setSavedPaymentMethods(response.methods);
          
          // Find a default method to select
          let methodToSelect = null;
          
          // Look for methods flagged as default from backend response
          const defaultMethod = response.methods.find(m => m.isDefault);
          if (defaultMethod) {
            console.log('Using method flagged as default from backend');
            methodToSelect = defaultMethod;
          } 
          // Otherwise use the method matching the defaultPaymentMethodId
          else if (response.defaultPaymentMethodId) {
            const defaultById = response.methods.find(m => m.id === response.defaultPaymentMethodId);
            if (defaultById) {
              console.log('Using method identified by defaultPaymentMethodId');
              methodToSelect = defaultById;
            }
          }
          // Fall back to latest card if no default is specified
          else if (response.methods.length > 0) {
            // Find the latest card payment method (most recently added)
            const cardMethods = response.methods.filter(m => m.type === 'card');
            if (cardMethods.length > 0) {
              methodToSelect = cardMethods[cardMethods.length - 1]; // Get the last card method
              console.log('Using most recently added card payment method as default');
              
              // Set this as the default in the backend
              try {
                const result = await setDefaultPaymentMethod(methodToSelect.id, currentUser.token);
                if (result.success) {
                  console.log('Updated default payment method in backend');
                }
              } catch (error) {
                console.error('Error setting default payment method:', error);
              }
            } else {
              methodToSelect = response.methods[0];
              console.log('No card methods found, using first available payment method as default');
            }
          }
          
          if (methodToSelect) {
            setSelectedSavedMethod(methodToSelect);
            setUseSavedMethod(true);
          }
          
          setLoadingPaymentMethods(false);
          return;
        } else {
          console.log('No payment methods returned from API');
          setSavedPaymentMethods([]);
          setSelectedSavedMethod(null);
          setUseSavedMethod(false);
        }
      } else {
        console.log('API response unsuccessful or no methods returned');
        setSavedPaymentMethods([]);
        setSelectedSavedMethod(null);
        setUseSavedMethod(false);
      }
    } catch (error) {
      console.error('Error fetching payment methods from API:', error);
      setSavedPaymentMethods([]);
      setSelectedSavedMethod(null);
      setUseSavedMethod(false);
    } finally {
      setLoadingPaymentMethods(false);
    }
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
  
  // Add this function at the top level of the component
  const findPlanById = (plans, planId) => {
    // First try direct ID match
    let selectedPlan = plans.find(p => p._id === planId);
    if (selectedPlan) {
      return { 
        plan: selectedPlan, 
        method: 'direct-id-match',
        message: `Found plan directly by ID: ${selectedPlan.name}`
      };
    }
    
    // Next try numeric index (starting at 1 for UX reasons)
    const planIndex = parseInt(planId, 10);
    if (!isNaN(planIndex) && planIndex > 0 && planIndex <= plans.length) {
      selectedPlan = plans[planIndex - 1];
      return { 
        plan: selectedPlan, 
        method: 'numeric-index',
        message: `Found plan by index ${planIndex}: ${selectedPlan.name}`
      };
    }
    
    // Try matching by name (case insensitive)
    const normalizedId = planId.toLowerCase();
    const planNames = plans.map(plan => plan.name.toLowerCase());
    if (planNames.includes(normalizedId)) {
      selectedPlan = plans.find(p => p.name.toLowerCase() === normalizedId);
      if (selectedPlan) {
        return { 
          plan: selectedPlan, 
          method: 'name-match',
          message: `Found plan by name: ${selectedPlan.name}`
        };
      }
    }
    
    // Default to first plan if nothing matched
    return { 
      plan: plans[0], 
      method: 'default-first',
      message: `No matching plan found for ID "${planId}". Defaulting to first plan: ${plans[0].name}`
    };
  };
  
  // Get plan ID and billing cycle from query params
  useEffect(() => {
    if (authError) return; // Don't fetch plans if auth failed
    
    const queryParams = new URLSearchParams(location.search);
    const planId = queryParams.get('plan');
    const cycle = queryParams.get('cycle');
    
    console.log(`URL Parameters - Plan: ${planId}, Cycle: ${cycle}`);
    
    if (cycle === 'yearly' || cycle === 'monthly') {
      setBillingCycle(cycle);
    }
    
    // Load PayPal script only once
    const loadPaypalScript = () => {
      // If script already loaded and PayPal available, use it
      if (window.paypal) {
        console.log('PayPal already loaded, skipping script load');
        setIsPaypalReady(true);
        return;
      }
      
      // If already in the process of loading
      if (document.getElementById('paypal-sdk')) {
        console.log('PayPal script loading in progress, waiting...');
        return;
      }
      
      try {
        const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID;
        if (!clientId) {
          console.error('PayPal client ID not found in environment');
          setPaypalError('PayPal configuration error. Please contact support.');
          return;
        }
        
        // Create a minimal script
        const script = document.createElement('script');
        script.id = 'paypal-sdk';
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
        script.async = true;
        
        // Set up event handlers
        script.onload = () => {
          console.log('PayPal SDK loaded successfully');
          setIsPaypalReady(true);
        };
        
        script.onerror = (err) => {
          console.error('PayPal script failed to load:', err);
          setPaypalError('Failed to load PayPal payment system');
        };
        
        // Add script to document
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error in PayPal script setup:', error);
        setPaypalError('Error setting up PayPal: ' + error.message);
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
          console.log('Available plans:', result.plans.map(p => `${p.name} (ID: ${p._id}, Index: ${result.plans.indexOf(p)})`));
          setPlans(result.plans);
          
          // Find the selected plan or default to first plan
          if (planId) {
            console.log(`Searching for plan with ID: ${planId}`);
            const planResult = findPlanById(result.plans, planId);
            console.log(planResult.message);
            console.log(`Selected plan details: ${planResult.plan.name}, ID: ${planResult.plan._id}, Method: ${planResult.method}`);
            
            setPlan(planResult.plan);
          } else {
            console.log('No plan ID provided, defaulting to first plan:', result.plans[0].name);
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
    
    // Cleanup function
    return () => {
      // Do nothing for cleanup
    };
  }, [location, authError]);
  
  // Add this useEffect to log whenever the plan changes
  useEffect(() => {
    if (plan) {
      console.log('Current plan set to:', plan.name, plan);
    }
  }, [plan]);
  
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
    // Only run this effect when all conditions are met to avoid infinite loops
    if (paymentMethod === 'paypal' && isPaypalReady && plan && window.paypal) {
      try {
        console.log('PayPal selected and ready, rendering basic buttons');
        
        // Use pro-rated price for upgrades, otherwise use the regular plan price
        const price = upgradeDetails 
          ? parseFloat(upgradeDetails.proratedUpgradeCost)
          : billingCycle === 'monthly' 
            ? plan.monthlyPrice
            : plan.yearlyPrice;
        
        const paypalContainer = document.getElementById('paypal-button-container');
        if (!paypalContainer) {
          console.error('PayPal container not found');
          return;
        }
        
        // Check if buttons already rendered to avoid duplicate renders
        if (paypalContainer.querySelector('.paypal-button')) {
          console.log('PayPal buttons already rendered, skipping');
          return;
        }
        
        // Clear the container first
        paypalContainer.innerHTML = '';
        
        // Create minimal button configuration
        const buttonConfig = {
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal'
          },
          createOrder: (data, actions) => {
            console.log('Creating PayPal order for plan:', plan.name, 'Price:', price);
            
            return actions.order.create({
              purchase_units: [{
                description: `${plan.name} Plan (${billingCycle})`,
                amount: {
                  value: price.toFixed(2),
                  currency_code: 'USD'
                }
              }],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW'
              }
            });
          },
          onApprove: async (data, actions) => {
            setProcessing(true);
            console.log('PayPal order approved:', data);
            
            try {
              // Capture the order
              const details = await actions.order.capture();
              console.log('Order captured:', details);
              
              // Extract PayPal email if available
              const paypalEmail = details.payer?.email_address || getCurrentUser().email;
              
              // Call backend to record the payment
              const response = await fetch('/api/subscriptions/paypal/record', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${getCurrentUser().token}`
                },
                body: JSON.stringify({
                  subscriptionId: data.orderID,
                  planId: plan._id,
                  billingCycle: billingCycle,
                  planName: plan.name,
                  price: price,
                  vaultInfo: {
                    payerID: details.payer?.payer_id,
                    email: paypalEmail
                  }
                })
              });
              
              const result = await response.json();
              
              if (!result.success) {
                console.warn('Warning: Backend failed to record payment:', result.error);
                setError('Payment processed but failed to update account. Please contact support.');
              } else {
                console.log('Payment recorded in backend:', result);
                
                // PayPal info will be available from the backend response, no need to save as payment method
                
                // Redirect to success page
                navigate('/payment-success');
              }
            } catch (error) {
              console.error('Error capturing order:', error);
              setError('Failed to process payment: ' + error.message);
            } finally {
              setProcessing(false);
            }
          },
          onCancel: () => {
            console.log('Payment canceled by user');
          },
          onError: (err) => {
            console.error('PayPal error:', err);
            setError('PayPal encountered an error: ' + (err.message || 'Unknown error'));
          }
        };
        
        // Simple render approach
        window.paypal.Buttons(buttonConfig).render('#paypal-button-container').catch(err => {
          console.error('PayPal render error:', err);
          setPaypalError('Failed to render PayPal buttons: ' + (err.message || 'Unknown error'));
        });
      } catch (error) {
        console.error('Error setting up PayPal:', error);
        setPaypalError('Error setting up PayPal: ' + error.message);
      }
    }
  }, [paymentMethod, isPaypalReady, plan, billingCycle, navigate, upgradeDetails]);
  
  // Modify the Apple Pay / Google Pay setup
  useEffect(() => {
    if (stripe && plan) {
      const price = upgradeDetails 
        ? parseFloat(upgradeDetails.proratedUpgradeCost) * 100 // Convert to cents for Stripe
        : billingCycle === 'monthly' 
          ? Math.round(plan.monthlyPrice * 100) 
          : Math.round(plan.yearlyPrice * 100);
      
      const label = upgradeDetails 
        ? `Upgrade to ${plan.name} Plan (${billingCycle})`
        : `${plan.name} Plan (${billingCycle})`;
      
      const pr = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
          label,
          amount: price,
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
            billingCycle,
            isUpgrade: !!upgradeDetails
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
  }, [stripe, plan, billingCycle, navigate, upgradeDetails]);
  
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
      expYear: null,
      isDefault: method.isDefault || false // Preserve isDefault flag
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
    
    if (!stripe || !elements) {
      setError("Stripe has not loaded yet. Please try again in a moment.");
      return;
    }
    
    if (processing) {
      return;
    }
    
    if (paymentMethod === 'paypal') {
      setError('Please use the PayPal button to complete your payment.');
      return;
    }
    
    setError('');
    setProcessing(true);
    
    try {
      let paymentMethodId;
      
      // If using a saved payment method
      if (useSavedMethod && selectedSavedMethod) {
        console.log('Using saved payment method:', selectedSavedMethod);
        paymentMethodId = selectedSavedMethod.id;
        
        // For PayPal payment methods, we don't need to validate the ID format
        if (selectedSavedMethod.type !== 'paypal' && (!paymentMethodId || !paymentMethodId.startsWith('pm_'))) {
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
            // Check if a card with same brand and last4 already exists
            const isDuplicate = savedPaymentMethods.some(method => 
              method.type === 'card' && 
              method.brand === paymentMethod.card.brand && 
              method.last4 === paymentMethod.card.last4
            );
            
            // Only save if not a duplicate
            if (!isDuplicate) {
              const newPaymentMethod = {
                id: paymentMethod.id,
                type: 'card',
                brand: paymentMethod.card.brand,
                last4: paymentMethod.card.last4,
                expMonth: paymentMethod.card.exp_month,
                expYear: paymentMethod.card.exp_year,
                isDefault: true // Explicitly mark as default when saving
              };
              
              const response = await savePaymentMethod(newPaymentMethod);
              
              if (response.success) {
                console.log('New payment method saved for future use and set as default');
                
                // No need for a separate setDefaultPaymentMethod call since we marked it as default
                // in the savePaymentMethod call above
              }
            } else {
              console.log('Card already exists in saved payment methods, not saving duplicate');
            }
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
        saveMethod: !useSavedMethod, // Only save if not using a saved method
        isUpgrade: !!upgradeDetails,
        proratedAmount: upgradeDetails ? upgradeDetails.proratedUpgradeCost : undefined
      });
      
      // Handle subscription status
      if (result.success) {
        console.log('Payment successful:', result);
        
        // Refresh payment methods from backend to get the latest default
        try {
          await loadSavedPaymentMethods();
        } catch (refreshError) {
          console.error('Error refreshing payment methods:', refreshError);
          // Continue with payment flow even if refresh fails
        }
        
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
  
  // Add a new function to calculate proration, after the findPlanById function:
  const calculateProRatedAmount = useCallback(async (currentPlan, newPlan, cycle) => {
    if (!currentPlan || !newPlan || currentPlan._id === newPlan._id) {
      return null;
    }

    setCalculatingProration(true);
    
    try {
      // Get the current user
      const user = getCurrentUser();
      if (!user || !user.subscription) {
        return null;
      }
      
      // Get plan prices based on the billing cycle
      const currentPrice = currentPlan.name === 'Free' ? 0 : (cycle === 'monthly' ? currentPlan.monthlyPrice : currentPlan.yearlyPrice);
      const newPrice = cycle === 'monthly' ? newPlan.monthlyPrice : newPlan.yearlyPrice;
      
      // Check if this is an upgrade (new price > current price)
      if (newPrice <= currentPrice) {
        return null; // Not an upgrade, no proration needed
      }
      
      // For Free plan, we show the same rich UI but with special values
      if (currentPlan.name === 'Free') {
        return {
          currentPlan: currentPlan.name,
          newPlan: newPlan.name,
          currentPrice: 0, // Always use 0 for Free plan (not "Free" text)
          newPrice,
          daysElapsed: 0,
          daysRemaining: 30,
          percentRemaining: '100%',
          currentPlanUsedValue: "0.00",
          proratedUpgradeCost: newPrice.toFixed(2),
          savingsAmount: "0.00",
          totalToPayNow: newPrice.toFixed(2),
          cycleEndDate: new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString(),
          isUpgrade: true,
          fromFree: true
        };
      }
      
      // Calculate days remaining in current billing cycle
      const now = new Date();
      let cycleEndDate;
      
      if (user.subscription.cycleEndDate) {
        cycleEndDate = new Date(user.subscription.cycleEndDate);
      } else if (user.subscription.endDate) {
        cycleEndDate = new Date(user.subscription.endDate);
      } else {
        // Fallback: Assume 30 days from now
        cycleEndDate = new Date();
        cycleEndDate.setDate(cycleEndDate.getDate() + 30);
      }
      
      const totalDaysInCycle = 30; // Standard cycle length
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      
      // Calculate days since start of cycle
      let cycleStartDate;
      if (user.subscription.cycleStartDate) {
        cycleStartDate = new Date(user.subscription.cycleStartDate);
      } else if (user.subscription.startDate) {
        cycleStartDate = new Date(user.subscription.startDate);
      } else {
        // Fallback: Assume started 1 day ago
        cycleStartDate = new Date();
        cycleStartDate.setDate(cycleStartDate.getDate() - 1);
      }
      
      const daysElapsed = Math.round((now - cycleStartDate) / millisecondsPerDay);
      const daysRemaining = Math.max(0, totalDaysInCycle - daysElapsed);
      const percentRemaining = daysRemaining / totalDaysInCycle;
      
      // Calculate used value of current plan
      const currentPlanUsedValue = currentPrice * (1 - percentRemaining);
      
      // Calculate prorated cost for upgrade
      const upgradePriceDifference = newPrice - currentPrice;
      const proratedUpgradeCost = (upgradePriceDifference * percentRemaining).toFixed(2);
      
      // Return the proration details
      return {
        currentPlan: currentPlan.name,
        newPlan: newPlan.name,
        currentPrice,
        newPrice,
        daysElapsed,
        daysRemaining,
        percentRemaining: (percentRemaining * 100).toFixed(0) + '%',
        currentPlanUsedValue: currentPlanUsedValue.toFixed(2),
        proratedUpgradeCost,
        savingsAmount: (upgradePriceDifference - proratedUpgradeCost).toFixed(2),
        totalToPayNow: proratedUpgradeCost,
        cycleEndDate: cycleEndDate.toLocaleDateString(),
        isUpgrade: true
      };
    } catch (error) {
      console.error('Error calculating proration:', error);
      return null;
    } finally {
      setCalculatingProration(false);
    }
  }, []);

  // Add a useEffect to calculate proration when the plan or billing cycle changes:
  useEffect(() => {
    const checkForUpgrade = async () => {
      const user = getCurrentUser();
      
      // Only calculate if user has an active subscription
      if (!user || !user.subscription || user.subscription.plan === 'free' || !plan) {
        setUpgradeDetails(null);
        return;
      }
      
      // Get the user's current plan from their subscription
      const currentPlanName = user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1);
      
      // Find the current plan in the available plans
      const currentPlan = plans.find(p => p.name === currentPlanName);
      
      if (!currentPlan || currentPlan._id === plan._id) {
        // Not an upgrade scenario
        setUpgradeDetails(null);
        return;
      }
      
      // Check if new plan price is higher than current plan (upgrade)
      const currentPrice = billingCycle === 'monthly' ? currentPlan.monthlyPrice : currentPlan.yearlyPrice;
      const newPrice = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
      
      if (newPrice > currentPrice) {
        // Calculate proration for the upgrade
        const details = await calculateProRatedAmount(currentPlan, plan, billingCycle);
        setUpgradeDetails(details);
      } else {
        setUpgradeDetails(null);
      }
    };
    
    checkForUpgrade();
  }, [plan, billingCycle, plans, calculateProRatedAmount]);
  
  // Helper function to get credit amount by plan name
  const getCreditAmount = (planName) => {
    if (!planName) return "";
    
    switch(planName.toLowerCase()) {
      case 'free':
        return "5";
      case 'starter':
        return "10";
      case 'growth':
        return "50";
      case 'pro':
        return "150";
      default:
        return "";
    }
  };
  
  // Helper function to get plan description based on plan name
  const getCreditDescription = (planName) => {
    if (!planName) return "";
    
    switch(planName) {
      case 'Free':
        return "Try it out with 5 free video credits per month";
      case 'Starter':
        return "Ideal for beginners with 10 video credits per month";
      case 'Growth':
        return "Ideal for growing creators and small businesses with 50 video credits per month";
      case 'Pro':
        return "Perfect for professional creators with 150 video credits per month";
      default:
        return "";
    }
  };
  
  const renderFallbackButtons = () => {
    // Determine if we have saved PayPal information
    const paypalMethod = savedPaymentMethods.find(method => method.type === 'paypal' && method.paypalPayerID);
    
    if (paypalMethod) {
      return (
        <div className="mb-4">
          <div className="bg-blue-900/20 border border-blue-500 rounded-md p-4 mb-4">
            <div className="flex items-start">
              <div className="text-blue-400 mr-3 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium">You'll need to authorize with PayPal again</p>
                <p className="text-gray-400 text-xs mt-1">
                  For security reasons, PayPal requires you to log in each time, but we'll use your saved payment information.
                </p>
              </div>
            </div>
            
            <div className="flex items-center mt-4 p-3 bg-gray-900 rounded-md">
              <FaPaypal className="text-[#0079C1] text-2xl mr-3" />
              <div>
                <p className="text-white text-sm font-medium">PayPal Account</p>
                <p className="text-gray-400 text-xs">{paypalMethod.email || 'PayPal account'}</p>
              </div>
              <div className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded">
                Saved
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
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
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-center mb-8">Complete Your Purchase</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan details section - Left column */}
          <div className="bg-tiktok-dark p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">{plan.name} Plan</h2>
            <p className="text-gray-400 mb-4">
              {plan.description || getCreditDescription(plan.name)}
            </p>
            
            {/* Show premium features for any paid plan (not Free), even if not upgrading */}
            {plan.name !== 'Free' && !upgradeDetails && (
              <div className="mt-2 mb-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-blue-400 p-3 rounded-md">
                <div className="text-white text-sm font-semibold mb-2 text-center">
                  Premium {plan.name} Plan Features
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>HD Video Quality</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>AI Voice Generation</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{plan.name !== 'Starter' ? 'Priority' : 'Email'} Support</span>
                  </div>
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>No Watermarks</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <span className="inline-block bg-blue-600 px-3 py-1 rounded-full text-white text-xs font-semibold">
                    {getCreditAmount(plan.name)} Video Credits Monthly 🚀
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex justify-between mb-6 items-center">
              <span>Billing Plan</span>
              <div className="flex items-center bg-gray-800 p-1 rounded-lg">
              <button
                onClick={() => setBillingCycle('monthly')}
                  className={`text-sm px-3 py-1 rounded-md transition-all ${
                    billingCycle === 'monthly' 
                      ? 'bg-tiktok-pink text-white shadow' 
                      : 'bg-transparent text-gray-300 hover:bg-gray-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                  className={`text-sm px-3 py-1 rounded-md ml-1 transition-all ${
                    billingCycle === 'yearly' 
                      ? 'bg-tiktok-pink text-white shadow' 
                      : 'bg-transparent text-gray-300 hover:bg-gray-700'
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
                <span>
                  {plan.name === 'Free' ? 
                    'Free' : 
                    `$${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}`
                  }
                </span>
            </div>
            
              {billingCycle === 'yearly' && plan.name !== 'Free' && (
              <div className="flex justify-between mb-2 text-green-500">
                <span>Yearly discount (20%)</span>
                <span>-${(plan.monthlyPrice * 12 * 0.2).toFixed(2)}</span>
              </div>
            )}
            
              {/* Pro-rated upgrade calculation */}
              {upgradeDetails && (
                <>
                  <div className="mt-3 border-t border-gray-700 pt-3 mb-2">
                    <div className="bg-gradient-to-r from-tiktok-pink to-blue-500 text-white px-3 py-2 rounded-md font-semibold mb-3 text-center">
                      Upgrade to {upgradeDetails.newPlan} and get more features today!
                    </div>
                    
                    <div className="flex items-center justify-center mb-4">
                      <div className="bg-gray-800 p-2 rounded-l-md">
                        <div className="text-gray-400 text-xs uppercase">Current</div>
                        <div className="font-bold">{upgradeDetails.currentPlan}</div>
                      </div>
                      <div className="px-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-tiktok-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </div>
                      <div className="bg-blue-500 bg-opacity-20 border border-blue-500 p-2 rounded-r-md">
                        <div className="text-blue-300 text-xs uppercase">Upgrade to</div>
                        <div className="font-bold text-white">{upgradeDetails.newPlan}</div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-md p-3 mb-3">
                      {/* Plans comparison in 2 columns */}
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Current Plan</div>
                          <div className="text-lg font-bold">
                            {upgradeDetails.currentPlan === 'Free' ? 
                              'Free' : 
                              `$${upgradeDetails.currentPrice}`
                            }
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-300 text-xs">New Plan</div>
                          <div className="text-lg font-bold text-white">${upgradeDetails.newPrice}</div>
                        </div>
                      </div>
                      
                      {/* Value already used - only show if there's a value */}
                      {parseFloat(upgradeDetails.currentPlanUsedValue) > 0 && (
                        <div className="flex justify-between items-center px-2 py-1 rounded bg-gray-700 bg-opacity-50 mb-2">
                          <span className="text-sm text-gray-300">Used portion value</span>
                          <span className="text-sm font-medium">-${upgradeDetails.currentPlanUsedValue}</span>
                        </div>
                      )}

                      {/* Special message for Free plan upgrades */}
                      {upgradeDetails && upgradeDetails.fromFree && (
                        <div className="mt-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-blue-400 p-3 rounded-md text-center mb-3">
                          <div className="text-white text-sm font-semibold mb-1">
                            Upgrade from Free to Premium
                          </div>
                          <span className="text-blue-300 text-sm">
                            Unlock all premium features with {getCreditAmount(upgradeDetails.newPlan)}x more video credits!
                          </span>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-left">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>HD Video Quality</span>
                            </div>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>AI Voice Generation</span>
                            </div>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>Priority Support</span>
                            </div>
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <span>No Watermarks</span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-center">
                            <span className="inline-block bg-blue-600 px-3 py-1 rounded-full text-white text-xs font-semibold">
                              First Premium Upgrade 🚀
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Show upgrade deal */}
                      <div className="mt-2 text-center bg-green-500 bg-opacity-20 border border-green-500 rounded-md p-2">
                        <div className="text-green-300 text-xs uppercase">
                          {upgradeDetails.fromFree ? 'Special Offer' : 'Upgrade Deal'}
                        </div>
                        <div className="text-green-400 font-bold text-lg">
                          {upgradeDetails.fromFree ? 
                            `Get ${getCreditAmount(upgradeDetails.newPlan)} monthly video credits` :
                            parseFloat(upgradeDetails.daysRemaining) === 30 
                              ? "Pay only the difference"
                              : `${upgradeDetails.percentRemaining} of your billing cycle remaining`
                          }
                        </div>
                        {parseFloat(upgradeDetails.savingsAmount) > 0 && (
                          <div className="mt-1 inline-block bg-green-600 px-2 py-1 rounded text-white text-xs">
                            You save ${upgradeDetails.savingsAmount}!
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Add benefit points for the upgrade */}
                    <div className="mb-3">
                      <div className="text-sm text-white mb-2">Unlock these premium features:</div>
                      <ul className="text-sm text-gray-300">
                        <li className="flex items-center mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          More video credits ({getCreditAmount(upgradeDetails.newPlan)} per month)
                        </li>
                        <li className="flex items-center mb-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Schedule & automate your videos
                        </li>
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Direct publish to TikTok
                        </li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
              
              {/* Modify the Total/Amount Due display to handle Free plan */}
              <div className={`flex justify-between font-bold text-lg mt-2 ${
                upgradeDetails || plan.name !== 'Free' 
                  ? 'bg-tiktok-pink bg-opacity-20 border border-tiktok-pink rounded-md p-2' 
                  : ''
              }`}>
                <span>{
                  upgradeDetails 
                    ? '🎉 Amount Due Today' 
                    : plan.name !== 'Free' 
                      ? '💰 Total Premium Plan' 
                      : 'Total'
                }</span>
              <span>
                  {plan.name === 'Free' && !upgradeDetails ? 
                    'Free' : 
                    `$${upgradeDetails 
                        ? upgradeDetails.proratedUpgradeCost
                        : billingCycle === 'monthly' 
                  ? plan.monthlyPrice.toFixed(2) 
                          : plan.yearlyPrice.toFixed(2)}`
                  }
                <span className="text-sm text-gray-400 ml-1">
                    {!upgradeDetails && plan.name !== 'Free' && `/${billingCycle === 'monthly' ? 'mo' : 'yr'}`}
                </span>
              </span>
            </div>
              
              {upgradeDetails && (
                <p className="text-center text-tiktok-pink text-sm mt-2 italic">
                  {upgradeDetails.fromFree 
                    ? `Upgrade to ${upgradeDetails.newPlan} to unlock HD quality, AI voice generation, and ${getCreditAmount(upgradeDetails.newPlan)} credits per month!`
                    : parseFloat(upgradeDetails.daysRemaining) === 30 
                      ? "You're getting a great deal! Upgrade now and enjoy premium features immediately!"
                      : `Pro-rated pricing gives you immediate access to better features. Upgrade now!`
                  }
                </p>
              )}
              
              {calculatingProration && (
                <div className="flex items-center justify-center mt-3 text-sm text-gray-400">
                  <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-tiktok-pink rounded-full mr-2"></div>
                  <span>Calculating your personalized upgrade offer...</span>
                </div>
              )}
          </div>
        </div>
        
          {/* Payment method section - Right column */}
        <div className="bg-tiktok-dark p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-6">Payment Method</h3>
          
          {/* Saved Payment Methods */}
          {savedPaymentMethods.length > 0 ? (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Your Payment Methods ({savedPaymentMethods.length})</h4>
                <div className="flex items-center space-x-3">
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
                                <div className="flex items-center">
                                  <span className="text-white font-medium">
                                    {method.type === 'card' ? (
                                      <>•••• {method.last4}</>
                                    ) : method.type === 'paypal' ? (
                                      'PayPal Account'
                                    ) : (
                                      'Payment Method'
                                    )}
                                  </span>
                                  
                                  {/* Default label */}
                                  {method.isDefault && (
                                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-xs rounded-full text-white">
                                      Default
                                    </span>
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
                  disabled={processing || (plan.name === 'Free' && !upgradeDetails)}
                  className={`w-full py-3 px-6 rounded-md font-semibold transition-all ${
                    plan.name !== 'Free' 
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                      : "bg-tiktok-pink text-white hover:bg-opacity-90"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    upgradeDetails && upgradeDetails.fromFree ? 
                      <span className="flex items-center justify-center">
                        <span>🚀 Unlock Premium for ${upgradeDetails.proratedUpgradeCost}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span> :
                    upgradeDetails ? 
                    `Upgrade Now for $${upgradeDetails.proratedUpgradeCost} with saved ${selectedSavedMethod.type === 'paypal' ? 'PayPal' : 'card'}` :
                    plan.name === 'Free' ? 
                    'Start Free Plan' :
                    <span className="flex items-center justify-center">
                      <span>🚀 Get Premium for ${billingCycle === 'monthly' ? plan.monthlyPrice.toFixed(2) : plan.yearlyPrice.toFixed(2)}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
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
                  {renderFallbackButtons()}
                  <div id="paypal-button-container" className="min-h-[200px] rounded-md flex items-center justify-center mb-4 p-2 bg-gray-900 border border-gray-700">
                    {!isPaypalReady && (
                      <div className="flex flex-col items-center justify-center">
                        <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-blue-500 rounded-full mb-4"></div>
                        <p className="text-gray-300 font-medium">Loading PayPal...</p>
                        <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
                      </div>
                    )}
                  </div>
                  {paypalError && (
                    <div className="bg-red-900/20 border border-red-500 rounded-md p-4 mt-2">
                      <p className="text-red-400 text-sm flex items-center font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {paypalError}
                      </p>
                      <div className="bg-gray-800 rounded p-3 mt-3 text-gray-400 text-sm">
                        <p className="mb-2">Troubleshooting:</p>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                          <li>Try refreshing the page</li>
                          <li>Disable ad blockers or browser extensions</li>
                          <li>Try a different browser</li>
                          <li>Use a credit card payment instead</li>
                        </ul>
                      </div>
                    </div>
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
                      disabled={processing || !stripe || (plan.name === 'Free' && !upgradeDetails)}
                      className={`w-full py-3 px-6 rounded-md font-semibold transition-all ${
                        plan.name !== 'Free'
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                          : "bg-tiktok-pink text-white hover:bg-opacity-90"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                      ) : upgradeDetails && upgradeDetails.fromFree ? 
                        <span className="flex items-center justify-center">
                          <span>🚀 Unlock Premium for ${upgradeDetails.proratedUpgradeCost}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </span> :
                        upgradeDetails ? 
                          `Upgrade Now for $${upgradeDetails.proratedUpgradeCost}` :
                          plan.name === 'Free' ? 
                            'Start Free Plan' :
                            <span className="flex items-center justify-center">
                              <span>🚀 Get Premium for ${billingCycle === 'monthly' ? plan.monthlyPrice.toFixed(2) : plan.yearlyPrice.toFixed(2)}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </span>
                      }
                  </button>
                </form>
              )}
            </>
          )}
          
            {/* Add explanatory text before subscription renewal message */}
          <p className="text-center text-sm text-gray-400 mt-4">
              {!upgradeDetails && plan.name !== 'Free' ? (
                <span className="text-tiktok-pink italic mb-2 block">
                  Get started with {plan.name} and enjoy HD videos, AI voice generation, and {getCreditAmount(plan.name)} monthly credits!
                </span>
              ) : null}
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
    </div>
  );
};

export default PaymentForm; 