import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CardElement, 
  useStripe, 
  useElements, 
  PaymentRequestButtonElement 
} from '@stripe/react-stripe-js';
import { getPlans, createPaymentIntent } from '../../services/subscriptionService';

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

  // Get plan ID and billing cycle from query params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const planId = queryParams.get('plan');
    const cycle = queryParams.get('cycle');
    
    if (cycle === 'yearly' || cycle === 'monthly') {
      setBillingCycle(cycle);
    }
    
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
  
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setProcessing(true);
    setError('');
    
    if (!stripe || !elements || !plan) {
      setProcessing(false);
      return;
    }
    
    try {
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
      
      // Create subscription with the payment method
      const priceId = billingCycle === 'monthly' 
        ? plan.monthlyPriceId
        : plan.yearlyPriceId;
      
      const result = await createPaymentIntent({
        priceId,
        paymentMethodId: paymentMethod.id,
        billingCycle
      });
      
      // Handle subscription status
      if (result.success) {
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
        
        <form onSubmit={handleSubmit} className="bg-tiktok-dark p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-6">Payment Method</h3>
          
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
          
          {/* Card Element */}
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
          
          <p className="text-center text-sm text-gray-400 mt-4">
            Your subscription will automatically renew each {billingCycle === 'monthly' ? 'month' : 'year'}.
            You can cancel anytime.
          </p>
          
          <div className="mt-6 flex justify-center space-x-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Visa.svg/1200px-Visa.svg.png" alt="Visa" className="h-8 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1200px-Mastercard-logo.svg.png" alt="Mastercard" className="h-8 opacity-60" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png" alt="Amex" className="h-8 opacity-60" />
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Secure payment processing by Stripe</p>
            <p className="mt-1">Your payment information is encrypted and secure</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;