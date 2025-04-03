import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CardElement, 
  useStripe, 
  useElements, 
  PaymentRequestButtonElement,
  PaymentElement
} from '@stripe/react-stripe-js';
import { getPlans, createPaymentIntent, savePaymentMethod } from '../../services/subscriptionService';
import { FaPaypal, FaApple, FaCreditCard, FaRegCreditCard, FaCcVisa, FaCcMastercard, FaCcAmex, FaCcDiscover } from 'react-icons/fa';
import { SiGooglepay } from 'react-icons/si';
import { getCurrentUser } from '../../services/authService';

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
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'paypal', 'express_checkout', 'saved'
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState(null);
  const [isPaypalReady, setIsPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const [useSavedMethod, setUseSavedMethod] = useState(false);

  // Get plan ID and billing cycle from query params
  useEffect(() => {
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
          setDebugInfo(prev => ({ ...prev, paypalAlreadyLoaded: true }));
          return;
        }
        
        const clientId = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'sb';
        setDebugInfo(prev => ({ ...prev, paypalClientId: clientId }));
        
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=subscription`;
        script.async = true;
        script.onload = () => {
          setIsPaypalReady(true);
          setDebugInfo(prev => ({ ...prev, paypalScriptLoaded: true }));
        };
        script.onerror = (err) => {
          console.error('PayPal script loading error:', err);
          setPaypalError(`Failed to load PayPal: ${err.message || 'Unknown error'}`);
          setDebugInfo(prev => ({ ...prev, paypalScriptError: err.message || 'Unknown error' }));
        };
        document.body.appendChild(script);
        setDebugInfo(prev => ({ ...prev, paypalScriptAttempted: true }));
      } catch (error) {
        console.error('Error setting up PayPal script:', error);
        setPaypalError(`PayPal setup error: ${error.message}`);
        setDebugInfo(prev => ({ ...prev, paypalSetupError: error.message }));
      }
    };
    
    loadPaypalScript();
    
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
  }, [location]);
  
  // Load user's saved payment methods
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.paymentMethods && currentUser.paymentMethods.length > 0) {
      setSavedPaymentMethods(currentUser.paymentMethods);
      
      // If user has a default payment method, pre-select it
      if (currentUser.paymentMethod) {
        setSelectedSavedMethod(currentUser.paymentMethod);
        setUseSavedMethod(true);
      }
    }
  }, []);
  
  // Setup Apple Pay / Google Pay
  const setupExpressCheckout = useCallback(() => {
    if (!stripe || !plan) return;
    
    try {
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
          
          // Store what's supported in debug info
          setDebugInfo(prev => ({ 
            ...prev, 
            expressCheckoutSupported: true,
            applePay: result.applePay || false, 
            googlePay: result.googlePay || false
          }));
          
          // Automatically set to Apple Pay if on iOS device and Apple Pay is available
          if (result.applePay) {
            setPaymentMethod('express_checkout');
          } 
          // Or to Google Pay if on Android
          else if (result.googlePay) {
            setPaymentMethod('express_checkout');
          }
        } else {
          setPaymentRequestSupported(false);
          setDebugInfo(prev => ({ ...prev, expressCheckoutSupported: false }));
        }
      }).catch(err => {
        console.error('Payment request setup error:', err);
        setDebugInfo(prev => ({ ...prev, expressCheckoutError: err.message }));
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
            saveMethod: true // Automatically save this payment method to the user's account
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
    } catch (error) {
      console.error('Express checkout setup error:', error);
      setDebugInfo(prev => ({ ...prev, expressCheckoutSetupError: error.message }));
    }
  }, [stripe, plan, billingCycle, navigate]);

  useEffect(() => {
    if (stripe && plan) {
      setupExpressCheckout();
    }
  }, [stripe, plan, setupExpressCheckout]);

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
          setDebugInfo(prev => ({ ...prev, paypalContainerNotFound: true }));
          return;
        }
        
        // Clear the container first
        paypalContainer.innerHTML = '';
        
        window.paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'black',
            shape: 'rect',
            label: 'subscribe'
          },
          createSubscription: async (data, actions) => {
            // This would connect to your backend which initiates a PayPal subscription
            // For demo, we're just redirecting to success page
            return actions.subscription.create({
              plan_id: 'P-1234567890', // This would be your PayPal plan ID
              application_context: {
                shipping_preference: 'NO_SHIPPING'
              }
            });
          },
          onApprove: async (data, actions) => {
            // Here you would verify the subscription with your backend
            setProcessing(true);
            
            try {
              // Mock saving the payment method info
              await savePaymentMethodToAccount({
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
            setDebugInfo(prev => ({ ...prev, paypalRenderError: err.message }));
          }
        }).render('#paypal-button-container').catch(err => {
          console.error('PayPal render error:', err);
          setDebugInfo(prev => ({ ...prev, paypalButtonRenderError: err.message }));
        });

        setDebugInfo(prev => ({ ...prev, paypalButtonsRendered: true }));
      } catch (error) {
        console.error('Error setting up PayPal:', error);
        setDebugInfo(prev => ({ ...prev, paypalRenderFatalError: error.message }));
      }
    }
  }, [paymentMethod, isPaypalReady, plan, billingCycle, navigate]);
  
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
  
  // Helper function to save payment method to user account
  const savePaymentMethodToAccount = async (paymentDetails) => {
    try {
      // Call our API to save the payment method to the user's account
      const response = await savePaymentMethod({
        id: paymentDetails.id,
        type: paymentDetails.type,
        brand: paymentDetails.brand,
        last4: paymentDetails.last4,
        expMonth: paymentDetails.expMonth,
        expYear: paymentDetails.expYear,
        nameOnCard: paymentDetails.nameOnCard || getCurrentUser().name
      });
      
      console.log('Payment method saved to account:', response);
      return true;
    } catch (error) {
      console.error('Error saving payment method to account:', error);
      return false;
    }
  };
  
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setProcessing(true);
    setError('');
    
    if (!stripe || !elements || !plan) {
      setProcessing(false);
      return;
    }
    
    try {
      let paymentMethodId;
      
      // If using a saved payment method
      if (useSavedMethod && selectedSavedMethod) {
        paymentMethodId = selectedSavedMethod.id;
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
        
        paymentMethodId = paymentMethod.id;
      }
      
      // Create subscription with the payment method
      const priceId = billingCycle === 'monthly' 
        ? plan.monthlyPriceId
        : plan.yearlyPriceId;
      
      const result = await createPaymentIntent({
        priceId,
        paymentMethodId,
        billingCycle,
        saveMethod: !useSavedMethod // Only save if not using an existing method
      });
      
      // Handle subscription status
      if (result.success) {
        // If payment method info is available and not using saved method, save it to account
        if (!useSavedMethod && paymentMethodId) {
          await savePaymentMethodToAccount({
            id: paymentMethodId,
            type: 'card',
            brand: elements.getElement(CardElement)?.brand,
            last4: elements.getElement(CardElement)?.last4,
            expMonth: elements.getElement(CardElement)?.exp_month,
            expYear: elements.getElement(CardElement)?.exp_year
          });
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
        setError(result.error || 'Subscription creation failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Something went wrong with your payment. Please try again.');
    } finally {
      setProcessing(false);
    }
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
    if (!useSavedMethod && savedPaymentMethods.length > 0 && !selectedSavedMethod) {
      setSelectedSavedMethod(savedPaymentMethods[0]);
    }
  };
  
  // Debug component to show payment method status
  const PaymentMethodsDebug = () => (
    <div className="bg-black/80 p-4 rounded-lg mt-4 text-xs border border-gray-700">
      <h4 className="font-bold mb-2">Payment Methods Status:</h4>
      <ul className="space-y-1">
        <li>
          <span className="font-medium">Card:</span> Always available
        </li>
        <li>
          <span className="font-medium">Express Checkout:</span> {paymentRequestSupported ? 
            (<span className="text-green-500">Available</span>) : 
            (<span className="text-red-500">Not supported by device/browser</span>)}
        </li>
        <li>
          <span className="font-medium">PayPal:</span> {isPaypalReady ? 
            (<span className="text-green-500">Ready</span>) : 
            (<span className="text-red-500">Not ready</span>)}
          {paypalError && <span className="text-red-500 ml-2">Error: {paypalError}</span>}
        </li>
      </ul>
      
      <div className="mt-3">
        <button 
          onClick={() => console.log('Debug info:', debugInfo)}
          className="text-xs text-gray-400 hover:text-white"
        >
          Log Debug Info
        </button>
      </div>
    </div>
  );
  
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
          {savedPaymentMethods.length > 0 && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Your Payment Methods</h4>
                <button 
                  onClick={toggleUseSavedMethod}
                  className="text-sm text-tiktok-pink hover:underline"
                >
                  {useSavedMethod ? 'Use new method' : 'Use saved method'}
                </button>
              </div>
              
              {useSavedMethod && (
                <div className="space-y-2 mb-4">
                  {savedPaymentMethods.map((method) => (
                    <div 
                      key={method.id}
                      onClick={() => handleSavedMethodSelect(method)}
                      className={`bg-gray-800 p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-700 transition-colors ${
                        selectedSavedMethod?.id === method.id ? 'border border-tiktok-pink' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        {method.type === 'card' ? (
                          <>
                            {getCardBrandIcon(method.brand)}
                            <span className="ml-2">•••• {method.last4}</span>
                            {method.expMonth && method.expYear && (
                              <span className="text-gray-400 text-sm ml-2">
                                Expires {method.expMonth}/{method.expYear}
                              </span>
                            )}
                          </>
                        ) : method.type === 'paypal' ? (
                          <>
                            <FaPaypal className="text-xl" />
                            <span className="ml-2">{method.email || 'PayPal Account'}</span>
                          </>
                        ) : (
                          <>
                            <FaCreditCard className="text-xl" />
                            <span className="ml-2">{method.brand}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center">
                        {selectedSavedMethod?.id === method.id && (
                          <div className="w-4 h-4 rounded-full bg-tiktok-pink"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Don't show payment method selector if using saved method */}
          {!useSavedMethod && (
            <>
              {/* Payment Method Selector */}
              <div className="mb-6">
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                      paymentMethod === 'card' 
                        ? 'bg-gradient-to-br from-tiktok-blue to-tiktok-pink text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <FaRegCreditCard className="text-2xl mb-2" />
                    <span className="text-xs">Card</span>
                  </button>
                  
                  {paymentRequestSupported && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('express_checkout')}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                        paymentMethod === 'express_checkout' 
                          ? 'bg-gradient-to-br from-tiktok-blue to-tiktok-pink text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex">
                        <FaApple className="text-2xl" />
                        <SiGooglepay className="text-2xl ml-1" />
                      </div>
                      <span className="text-xs mt-2">Express</span>
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('paypal')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${
                      paymentMethod === 'paypal' 
                        ? 'bg-gradient-to-br from-tiktok-blue to-tiktok-pink text-white' 
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <FaPaypal className="text-2xl mb-2" />
                    <span className="text-xs">PayPal</span>
                  </button>
                </div>
              </div>
              
              {/* Express Checkout with Apple Pay / Google Pay */}
              {paymentMethod === 'express_checkout' && paymentRequestSupported && paymentRequest && (
                <div className="mb-6">
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
                </div>
              )}
              
              {/* PayPal Checkout */}
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
                    type="submit"
                    disabled={processing || !stripe}
                    className="w-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white py-3 px-6 rounded-md font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          {/* Saved Method Payment Button */}
          {useSavedMethod && selectedSavedMethod && (
            <div>
              {error && (
                <div className="text-red-500 mb-4 text-sm">{error}</div>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={processing}
                className="w-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white py-3 px-6 rounded-md font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          )}
          
          {/* Diagnostics */}
          <PaymentMethodsDebug />
          
          <div className="mt-6 flex justify-center space-x-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Visa.svg/1200px-Visa.svg.png" alt="Visa" className="h-8 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1200px-Mastercard-logo.svg.png" alt="Mastercard" className="h-8 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png" alt="Amex" className="h-8 opacity-60" />
          </div>
          
          <p className="text-center text-sm text-gray-400 mt-4">
            Your subscription will automatically renew each {billingCycle === 'monthly' ? 'month' : 'year'}.
            You can cancel anytime.
          </p>
          
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