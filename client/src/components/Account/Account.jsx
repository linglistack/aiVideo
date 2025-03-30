import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getProfile, refreshToken } from '../../services/authService';
import { savePaymentMethod, getPaymentMethods, deletePaymentMethod, getPaymentHistory } from '../../services/paymentService';
import axios from 'axios';
import { 
  IoPersonOutline, 
  IoMailOutline, 
  IoCallOutline, 
  IoBriefcaseOutline, 
  IoLockClosedOutline, 
  IoSaveOutline,
  IoShieldOutline,
  IoKeyOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoTrashOutline,
  IoWarningOutline,
  IoCloudUploadOutline,
  IoReloadOutline,
  IoDownloadOutline
} from 'react-icons/io5';
import * as subscriptionService from '../../services/subscriptionService';
import * as authService from '../../services/authService';

const Account = ({ user, setUser, subscriptionUsage, loadingUsage, setSubscriptionUsage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showAvatarInput, setShowAvatarInput] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [showDeleteAccountConfirmation, setShowDeleteAccountConfirmation] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const fileInputRef = useRef(null);
  
  // Payment tab state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    nameOnCard: ''
  });
  const [processingCard, setProcessingCard] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || ''
  });
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Avatar state - placeholder for future implementation
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Add refs for direct DOM manipulation
  const cardNumberRef = useRef(null);
  const expiryMonthRef = useRef(null);
  const expiryYearRef = useRef(null);
  const cvcRef = useRef(null);
  const nameOnCardRef = useRef(null);
  
  // Check for tab query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['profile', 'password', 'subscription', 'payment', 'danger'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);
  
  // Fetch user profile and payment methods on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const profileResponse = await getProfile();
        if (profileResponse.success) {
          // Update local form state with latest user data
          setProfileForm({
            name: profileResponse.user.name || '',
            email: profileResponse.user.email || '',
            phone: profileResponse.user.phone || '',
            company: profileResponse.user.company || ''
          });
          
          // Set avatar if available
          if (profileResponse.user.avatar) {
            setAvatar(profileResponse.user.avatar);
          }
          
          // Only update global user state if there are differences
          const hasChanges = JSON.stringify(user) !== JSON.stringify(profileResponse.user);
          if (hasChanges) {
            console.log('Updating user state with new profile data');
            setUser(profileResponse.user);
          }
        }
        
        // Always fetch payment methods on load to ensure they're up to date
        try {
          // Try to get token directly from localStorage for reliability
          let token = null;
          const userString = localStorage.getItem('user');
          if (userString) {
            const userData = JSON.parse(userString);
            if (userData && userData.token) {
              token = userData.token;
            }
          }
          
          // Use profile response token as fallback
          if (!token && profileResponse.success) {
            token = profileResponse.user.token;
          }
          
          // Use user prop token as last resort
          if (!token && user?.token) {
            token = user.token;
          }
          
          if (token) {
            console.log('Fetching payment methods on initial load...');
            const paymentResponse = await getPaymentMethods(token);
            if (paymentResponse.success && paymentResponse.methods) {
              console.log('Payment methods fetched:', paymentResponse.methods);
              setPaymentMethods(paymentResponse.methods);
              
              // If we have payment methods, update the user object
              if (paymentResponse.methods.length > 0) {
                const updatedUser = JSON.parse(localStorage.getItem('user')) || user || {};
                updatedUser.paymentMethod = paymentResponse.methods[0];
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                // Update app state if we aren't already using user from profile response
                if (!profileResponse.success) {
                  setUser(updatedUser);
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to load payment methods:', error);
        }
      } catch (error) {
        setError('Failed to load profile. Please try again.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []); // Empty dependency array so it only runs once on mount
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Update the URL without reloading
    const newUrl = `/account${tab === 'profile' ? '' : `?tab=${tab}`}`;
    window.history.pushState({}, '', newUrl);
    // Clear any previous success/error messages when changing tabs
    setSuccess('');
    setError('');
    
    // If switching to payment tab, refresh the payment methods
    if (tab === 'payment') {
      fetchPaymentMethods();
    }
  };
  
  // Fetch payment methods from server
  const fetchPaymentMethods = async () => {
    console.log('Fetching payment methods...');
    try {
      // Get token directly from localStorage for reliability
      let token = null;
      const userString = localStorage.getItem('user');
      if (userString) {
        const userData = JSON.parse(userString);
        if (userData && userData.token) {
          token = userData.token;
        }
      }
      
      // Use the component user state token as fallback
      if (!token && user?.token) {
        token = user.token;
      }
      
      if (!token) {
        console.error('No token available to fetch payment methods');
        return;
      }
      
      const response = await getPaymentMethods(token);
      if (response.success && response.methods) {
        console.log('Payment methods fetched successfully:', response.methods);
        setPaymentMethods(response.methods);
        
        // If payment methods were fetched, update the user state and localStorage
        if (response.methods.length > 0) {
          const updatedUser = { ...user };
          updatedUser.paymentMethod = response.methods[0];
          setUser(updatedUser);
          
          // Update localStorage
          const storedUser = JSON.parse(localStorage.getItem('user')) || {};
          storedUser.paymentMethod = response.methods[0];
          localStorage.setItem('user', JSON.stringify(storedUser));
        }
      } else {
        console.log('No payment methods found or error in response');
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };
  
  // Handle profile form changes
  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle password form changes
  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle avatar click
  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };
  
  // Handle avatar upload - placeholder for future implementation
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For now, just create a local object URL
      // In a real implementation, you would upload to a server
      setUploadingAvatar(true);
      
      setTimeout(() => {
        const objectUrl = URL.createObjectURL(file);
        setAvatar(objectUrl);
        setUploadingAvatar(false);
        
        // Reset file input
        e.target.value = null;
      }, 1000);
    }
  };
  
  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const response = await axios.put(
        'http://localhost:5000/api/auth/profile',
        profileForm,
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      
      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        
        // Update local storage and user state
        const updatedUser = { ...user, ...profileForm, avatar };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        // Auto dismiss success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    
    setLoading(true);
    
    try {
      // First, refresh the token to ensure we have the latest valid one
      const refreshResult = await refreshToken();
      
      if (!refreshResult.success) {
        setError(`${refreshResult.error} Please try logging out and back in.`);
        setLoading(false);
        return;
      }
      
      // Only update the user state if there are actual changes
      const hasUserChanges = JSON.stringify(user) !== JSON.stringify(refreshResult.user);
      if (hasUserChanges) {
        console.log('Updating user with refreshed data');
        setUser(refreshResult.user);
      }
      
      // Get fresh user data from the refreshResult
      const currentUser = refreshResult.user;
      
      console.log('Sending change password request with refreshed token');
      
      const response = await axios.put(
        'http://localhost:5000/api/auth/change-password',
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`
          }
        }
      );
      
      if (response.data.success) {
        setSuccess(response.data.message || 'Password changed successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Auto dismiss success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
        
        // Update the user object with hasPassword flag only if needed
        if (response.data.hasPassword && (!user.hasPassword || user.hasPassword !== true)) {
          const updatedUser = { 
            ...currentUser, 
            hasPassword: true 
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Password change error:', error);
      
      if (error.response && error.response.status === 401) {
        setError('Your session has expired. Please log out and log in again before changing your password.');
      } else {
        setError(error.response?.data?.error || 'Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Delete account
  const handleDeleteAccount = async () => {
    setLoading(true);
    
    try {
      const response = await axios.delete(
        'http://localhost:5000/api/auth/account',
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );
      
      if (response.data.success) {
        // Clear user data and redirect to home
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete account');
      console.error(error);
      setShowDeleteAccountConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle card input changes with a simpler approach
  const handleCardChange = (e) => {
    const { name, value } = e.target;
    
    // Create a copy of the form data
    const updatedForm = { ...cardForm };
    
    // Update the specific field
    if (name === 'expiryMonth' || name === 'expiryYear' || name === 'cvc') {
      // Only allow digits for these fields
      const digits = value.replace(/\D/g, '');
      updatedForm[name] = digits;
    } else {
      updatedForm[name] = value;
    }
    
    // Update state with the new form data
    setCardForm(updatedForm);
  };
  
  // Save payment method
  const handleSaveCard = async (e) => {
    e.preventDefault();
    setProcessingCard(true);
    setError('');
    setSuccess('');
    
    try {
      // Format payment data for API
      const paymentData = {
        cardNumber: cardForm.cardNumber.replace(/\s/g, ''), // Remove spaces
        expiryMonth: cardForm.expiryMonth,
        expiryYear: cardForm.expiryYear,
        cvc: cardForm.cvc,
        nameOnCard: cardForm.nameOnCard
      };
      
      // Call the API to save the payment method
      const response = await savePaymentMethod(paymentData, user.token);
      
      // Handle success
      setSuccess('Payment method added successfully!');
      setShowAddCardModal(false);
      
      // Update the user object with the returned payment method
      const updatedUser = { 
        ...user, 
        paymentMethod: response.paymentMethod || {
          // Fallback in case API doesn't return the expected format
          last4: cardForm.cardNumber.slice(-4),
          brand: 'visa',
          expMonth: cardForm.expiryMonth,
          expYear: cardForm.expiryYear
        } 
      };
      
      // Update local storage and user state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Reset card form
      setCardForm({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvc: '',
        nameOnCard: ''
      });
    } catch (error) {
      setError(typeof error === 'string' ? error : 'Failed to add payment method. Please try again.');
      console.error(error);
    } finally {
      setProcessingCard(false);
    }
  };

  // Handle delete payment method
  const handleDeletePaymentMethod = async () => {
    setProcessingCard(true);
    setError('');
    setSuccess('');
    
    try {
      // Call API to delete the payment method
      if (user?.paymentMethod?.id) {
        await deletePaymentMethod(user.paymentMethod.id, user.token);
      }
      
      // Update the user object to remove the payment method
      const updatedUser = { ...user };
      delete updatedUser.paymentMethod;
      
      // Update local storage and user state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setSuccess('Payment method removed successfully!');
    } catch (error) {
      setError(typeof error === 'string' ? error : 'Failed to remove payment method. Please try again.');
      console.error(error);
    } finally {
      setProcessingCard(false);
    }
  };

  // Handle card number input with formatting
  const handleCardNumberChange = (e) => {
    // Get the raw value without spaces
    const rawValue = e.target.value.replace(/\s/g, '');
    
    // Format with spaces
    let formatted = '';
    for (let i = 0; i < rawValue.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += rawValue[i];
    }
    
    // Update the form state
    setCardForm({
      ...cardForm,
      cardNumber: formatted
    });
  };
  
  // Subscription Tab Content
  const renderSubscriptionTab = () => {
    // Helper function to format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };

    // If we have subscription usage data from the API, use it
    // Otherwise, fall back to the data from the user object
    const subscription = subscriptionUsage || user?.subscription || {
      plan: 'Free Plan',
      videosUsed: 0,
      videosLimit: 10,
      status: 'inactive',
      startDate: null,
      renewDate: null
    };

    // Get current plan details - ensure "Free Plan" is properly capitalized
    const currentPlan = subscription.plan ? 
      (subscription.plan.toLowerCase() === 'free' || subscription.plan.toLowerCase() === 'free plan' ? 
        'Free Plan' : subscription.plan) : 
      'Free Plan';
      
    const isFreePlan = currentPlan === 'Free Plan' || !subscription || subscription.plan?.toLowerCase() === 'free';
    const planPrice = subscription.price || (
      currentPlan.toLowerCase() === 'starter' ? 19 :
      currentPlan.toLowerCase() === 'growth' ? 49 :
      currentPlan.toLowerCase() === 'scale' ? 95 : 0
    );
    const planStatus = subscription.status || subscription.isActive ? 'active' : 'inactive';
    const startDate = subscription.startDate;
    const nextBillingDate = subscription.renewDate || subscription.endDate;
    
    // Ensure videos limit is consistent
    // If subscription comes from API, it should use the API's value
    // If from user object, need to match dashboard's structure
    const videosUsed = subscription.videosUsed || 0;
    const videosLimit = isFreePlan ? 0 : (subscription.videosLimit || (
      currentPlan.toLowerCase() === 'starter' ? 10 :
      currentPlan.toLowerCase() === 'growth' ? 50 :
      currentPlan.toLowerCase() === 'scale' ? 150 : 10
    ));
    
    // Use storage data from subscription if available
    const storageUsed = subscription.storageUsed || user?.usage?.storage || 0;
    const storageLimit = subscription.storageLimit || user?.subscription?.limits?.storage || 1;
    
    // Use videosRemaining from the API if available, otherwise calculate it
    const videosRemaining = subscription.videosRemaining !== undefined
      ? subscription.videosRemaining
      : Math.max(0, videosLimit - videosUsed);
    
    // Calculate usage percentage - avoid division by zero
    const videoUsagePercent = videosLimit > 0 ? Math.min(100, (videosUsed / videosLimit) * 100) : 0;

    // Plans definition - in a real app, these would come from an API
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: 19,
        monthlyPrice: 19,
        yearlyPrice: 190, // ~20% discount for annual
        monthlyPriceId: 'price_starter_monthly',
        yearlyPriceId: 'price_starter_yearly',
        videos: 10,
        storage: '5GB',
        features: ['Basic editing tools', 'Standard quality', 'Email support']
      },
      {
        id: 'growth',
        name: 'Growth',
        price: 49,
        monthlyPrice: 49,
        yearlyPrice: 470, // ~20% discount for annual
        monthlyPriceId: 'price_growth_monthly',
        yearlyPriceId: 'price_growth_yearly',
        videos: 50,
        storage: '25GB',
        features: ['Advanced editing tools', 'HD quality', 'Priority support']
      },
      {
        id: 'scale',
        name: 'Scale',
        price: 95,
        monthlyPrice: 95,
        yearlyPrice: 912, // ~20% discount for annual
        monthlyPriceId: 'price_scale_monthly',
        yearlyPriceId: 'price_scale_yearly',
        videos: 150,
        storage: '100GB',
        features: ['Premium effects', '4K quality', '24/7 dedicated support']
      }
    ];

    // Find current plan in plans array (case insensitive comparison)
    const userPlanDetails = plans.find(plan => 
      plan.name.toLowerCase() === currentPlan.toLowerCase() ||
      plan.id.toLowerCase() === currentPlan.toLowerCase()
    ) || plans[0];
    
    // Mock payment history
    const paymentHistory = user?.subscription?.payments || subscription?.payments || [
      // If no payment history exists, show these examples in development
      ...(process.env.NODE_ENV === 'development' ? [
        { id: 'pi_123456', date: '2023-03-28', amount: planPrice, plan: currentPlan, status: 'succeeded' }
      ] : [])
    ];

    // Handle upgrade/change plan
    const handleChangePlan = async (planId, billingCycle = 'monthly') => {
      setProcessingPayment(true);
      
      try {
        // Get selected plan
        const selectedPlan = plans.find(p => p.id === planId);
        if (!selectedPlan) {
          throw new Error('Plan not found');
        }
        
        // Select the appropriate Stripe priceId based on billing cycle
        const priceId = billingCycle === 'monthly' 
          ? selectedPlan.monthlyPriceId 
          : selectedPlan.yearlyPriceId;
        
        // Create a checkout session with Stripe
        const response = await subscriptionService.createCheckoutSession({
          priceId,
          billingCycle
        });
        
        if (response.success && response.url) {
          // Redirect to the Stripe Checkout page
          window.location.href = response.url;
        } else {
          // If there's no URL, fall back to the payment page
          navigate(`/payment?plan=${planId}&billing=${billingCycle}`);
        }
        
      } catch (error) {
        console.error('Payment error:', error);
        setError('Failed to process plan change. Please try again.');
        setProcessingPayment(false);
        setShowPlanModal(false);
      }
    };

    // Handle cancel subscription
    const handleCancelSubscription = async () => {
      setProcessingPayment(true);
      
      try {
        // Call the service to cancel the subscription
        const response = await subscriptionService.cancelSubscription({
          reason: cancelReason || 'No reason provided'
        });
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to cancel subscription');
        }
        
        // First refresh subscription data to get latest status
        const refreshResponse = await subscriptionService.refreshSubscriptionData();
        
        // Then refresh the full user profile to ensure everything is updated
        const refreshedUser = await authService.getCurrentUser();
        if (refreshedUser) {
          setUser(refreshedUser);
        }
        
        setShowCancelModal(false);
        setSuccess('Your subscription has been successfully canceled. You will have access until the end of your billing period on ' + formatDate(nextBillingDate));
        
        // Force refresh the subscription usage data
        if (typeof loadingUsage === 'function') {
          loadingUsage(true);
          try {
            const usageResponse = await subscriptionService.getSubscriptionUsage();
            if (usageResponse.success) {
              // If component receives setSubscriptionUsage as prop
              if (typeof setSubscriptionUsage === 'function') {
                setSubscriptionUsage(usageResponse.usage);
              } else {
                console.log('Usage data refreshed, but setSubscriptionUsage not available:', usageResponse.usage);
              }
            }
          } catch (usageError) {
            console.error('Failed to refresh usage after cancellation:', usageError);
          } finally {
            if (typeof loadingUsage === 'function') {
              loadingUsage(false);
            }
          }
        }
        
      } catch (error) {
        setError('Failed to cancel subscription. Please try again.');
        console.error('Cancel subscription error:', error);
      } finally {
        setProcessingPayment(false);
      }
    };

    // Modal for plan selection
    const PlanSelectionModal = () => {
      const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly');
      
      // Calculate annual savings
      const calculateSavings = (plan) => {
        const monthlyTotal = plan.monthlyPrice * 12;
        const yearlyTotal = plan.yearlyPrice;
        const savingsAmount = monthlyTotal - yearlyTotal;
        const savingsPercentage = Math.round((savingsAmount / monthlyTotal) * 100);
        
        return {
          amount: savingsAmount.toFixed(2),
          percentage: savingsPercentage
        };
      };
      
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
          <div className="bg-tiktok-dark rounded-xl max-w-4xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Change Your Plan</h2>
              <button 
                onClick={() => setShowPlanModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">
              You can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the
              prorated difference immediately. If you downgrade, your new plan will take effect at the end of your
              current billing cycle.
            </p>
            
            {/* Billing cycle toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-900 p-1 rounded-xl inline-flex">
                <button
                  onClick={() => setSelectedBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedBillingCycle === 'monthly'
                      ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    selectedBillingCycle === 'yearly'
                      ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="ml-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = plan.name.toLowerCase() === currentPlan.toLowerCase();
                const price = selectedBillingCycle === 'yearly' ? plan.yearlyPrice / 12 : plan.monthlyPrice;
                const totalPrice = selectedBillingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice * 12;
                const savings = calculateSavings(plan);
                
                return (
                  <div 
                    key={plan.id}
                    className={`bg-gray-900 rounded-xl p-6 border-2 ${
                      isCurrentPlan 
                        ? 'border-tiktok-pink' 
                        : 'border-gray-800 hover:border-gray-700'
                    } transition-all`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      {isCurrentPlan && (
                        <span className="bg-tiktok-pink text-white text-xs font-medium px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    
                    <p className="text-3xl font-bold mb-1">
                      ${price.toFixed(2)}
                      <span className="text-sm text-gray-400 font-normal">/month</span>
                    </p>
                    
                    {selectedBillingCycle === 'yearly' && (
                      <p className="text-green-500 text-sm mb-4">
                        ${totalPrice.toFixed(2)} billed annually 
                        <span className="text-green-500 ml-1">
                          (Save ${savings.amount})
                        </span>
                      </p>
                    )}
                    
                    <p className="text-gray-400 mb-4">{plan.videos} videos/month</p>
                    
                    <ul className="text-sm text-gray-300 space-y-2 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <svg className="h-5 w-5 text-tiktok-pink mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => handleChangePlan(plan.id, selectedBillingCycle)}
                      disabled={isCurrentPlan || processingPayment}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        isCurrentPlan
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white hover:opacity-90'
                      }`}
                    >
                      {processingPayment ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                          Processing...
                        </div>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : (
                        'Select Plan'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            
            {/* Payment methods information */}
            <div className="mt-6 border-t border-gray-800 pt-6">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4">Secure payment powered by Stripe</p>
                <div className="flex justify-center space-x-4">
                  {/* Credit Card */}
                  <div className="bg-gray-900 px-4 py-2 rounded-lg">
                    <svg className="h-6" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="24" rx="4" fill="#171E2E"/>
                      <path d="M7 10h26M11 15h4M18 15h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  
                  {/* PayPal */}
                  <div className="bg-gray-900 px-4 py-2 rounded-lg">
                    <svg className="h-6" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="24" rx="4" fill="#171E2E"/>
                      <path d="M9.145 8h6.535c1.816 0 3.562 1.151 3.191 3.321C18.5 13.5 16.655 14.7 14.565 14.7h-1.309c-.371 0-.618.41-.742.821L12 18H9l1.855-8.6c.123-.246.247-.41.495-.41h.866c.495 0 .618.246.618.41.124.575-.495.575-.495.575s-.123-.205-.247-.205c-.124 0-.247.205-.371.205H9.516c-.247 0-.494.163-.618.575L9.145 8z" fill="#009CDE"/>
                      <path d="M22 12.7h3.145c.123-.576.619-3.322.619-3.322s.247-1.232 1.236-1.232h2.224c1.484 0 2.35.822 2.102 2.465-.372 2.794-2.101 5.177-4.694 5.177h-2.225c-.245 0-.494.165-.619.658L23.42 18H20.5l.619-2.877c.123-.493.123-.493.37-.658h.866c.495 0 .619.165.495.658h-.618c-.124 0-.248.164-.372.164h-.99c-.248 0-.371-.164-.495-.657L22 12.7z" fill="#003087"/>
                      <path d="M29.326 10.434c-.123-.658-.618-.986-1.36-.986h-.494c-.124 0-.248.328-.124.328h.495c.37 0 .618.164.618.493 0 .329-.123.657-.247.986-.124.328-.619 1.315-1.237 1.315h-1.855l.371-1.974c.124-.493.248-.822.866-.822h.372c.123-.328.247-.328.123-.328h-.619c-.494 0-.618.164-.741.657l-.495 2.302-.124.822c0 .164.124.328.372.328h2.349c.99 0 1.73-1.151 1.73-2.302 0-.165 0-.329-.124-.493l.124-.326z" fill="#003087"/>
                    </svg>
                  </div>
                  
                  {/* Apple Pay */}
                  <div className="bg-gray-900 px-4 py-2 rounded-lg">
                    <svg className="h-6" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="40" height="24" rx="4" fill="#171E2E"/>
                      <path d="M14.507 8.25c.414-.519.695-1.22.622-1.93-.624.035-1.38.432-1.82.957-.4.46-.736 1.189-.641 1.887.693.022 1.42-.375 1.839-.914zM16.375 17.364c.692.866 1.006 1.235 1.888 1.235 0 0 .168-.51.498-.151.498-.173 1.151-.509 1.799-1.193-1.475-.797-1.714-2.928-.363-3.92-.78-.969-1.91-.984-2.233-.984-.984 0-1.77.537-2.233.537-.497 0-1.179-.508-1.97-.508-1.532.016-2.969 1.265-2.969 3.058 0 1.9.736 3.919 1.658 5.22.4.605.877 1.265 1.515 1.265.605 0 .984-.411 1.835-.411.865 0 1.178.411 1.798.411.642 0 1.118-.649 1.54-1.265.27-.433.505-.865.666-1.265-1.151-.447-2-1.64-2-3.058 0-1.004.502-1.874 1.280-2.427-.778-.968-1.937-.97-1.937-.97.019.031.244 1.415 1.214 2.426zm8.78-7.363h-2.76l-1.592 4.692h-.031l-1.593-4.692h-2.777l3.093 8.531L16.71 23h2.68l5.763-13z" fill="white"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // Modal for cancel confirmation
    const CancelConfirmationModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4 py-6">
        <div className="bg-tiktok-dark rounded-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Cancel Subscription</h2>
            <button 
              onClick={() => setShowCancelModal(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-gray-300 mb-6">
            Are you sure you want to cancel your subscription? You'll still have access until the end of your current billing cycle.
          </p>
          
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">
              Why are you cancelling? (Optional)
            </label>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="bg-gray-800 text-white rounded-lg w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none"
            >
              <option value="">Select a reason...</option>
              <option value="too_expensive">Too expensive</option>
              <option value="not_using">Not using it enough</option>
              <option value="missing_features">Missing features I need</option>
              <option value="switching">Switching to another service</option>
              <option value="other">Other reason</option>
            </select>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Keep Subscription
            </button>
            
            <button
              onClick={handleCancelSubscription}
              disabled={processingPayment}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              {processingPayment ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Cancel Subscription'
              )}
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="space-y-8">
        {/* Current Plan & Summary */}
        <div className="bg-tiktok-dark rounded-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <IoShieldOutline className="text-tiktok-pink text-3xl mr-4" />
              <h2 className="text-xl font-bold">{currentPlan}</h2>
            </div>
            <span className={`${
              subscription.cancelAtPeriodEnd || subscription.isCanceled
                ? 'bg-red-500/20 text-red-500' 
                : planStatus === 'active' 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-yellow-500/20 text-yellow-500'
            } px-3 py-1 rounded-full text-sm font-medium`}>
              {subscription.cancelAtPeriodEnd || subscription.isCanceled
                ? 'Canceled'
                : planStatus === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Billing Cycle</p>
              <p className="text-lg font-medium text-white capitalize">{subscription.billingCycle || 'Monthly'}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Start Date</p>
              <p className="text-lg font-medium text-white">{formatDate(startDate)}</p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">{subscription.cancelAtPeriodEnd || subscription.isCanceled ? 'Access Until' : 'Next Billing Date'}</p>
              <p className="text-lg font-medium text-white">
                {formatDate(nextBillingDate)}
                {(subscription.cancelAtPeriodEnd || subscription.isCanceled) && 
                  <span className="block text-xs text-red-400 mt-1">
                    Your subscription will end on this date
                  </span>
                }
              </p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Price</p>
              <p className="text-lg font-medium text-white">
                ${subscription.billingCycle === 'yearly' 
                  ? (userPlanDetails.yearlyPrice / 12).toFixed(2) 
                  : userPlanDetails.monthlyPrice?.toFixed(2) || planPrice}/month
                {subscription.billingCycle === 'yearly' && (
                  <span className="block text-sm text-green-500">
                    ${userPlanDetails.yearlyPrice?.toFixed(2)} billed yearly
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="bg-gray-800 p-5 rounded-xl mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Videos Used</h3>
              <p className="text-gray-400 text-sm">{videosUsed} / {videosLimit}</p>
            </div>
            <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink"
                style={{ width: `${videoUsagePercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isFreePlan 
                ? "Upgrade to get more videos per month"
                : `${videosLimit - videosUsed} videos remaining this billing cycle`}
            </p>
          </div>
          
          {/* Show different action buttons based on subscription status */}
          {(subscription.cancelAtPeriodEnd || subscription.isCanceled) ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400 mb-2">
                <span className="font-medium">Your subscription has been canceled</span> but you still have access until the end of your billing period.
              </p>
              <p className="text-sm text-gray-400">
                Want to stay with us? You can resubscribe below.
              </p>
            </div>
          ) : !isFreePlan ? (
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPlanModal(true)}
                className="flex-1 bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-4 rounded-xl hover:opacity-90 transition-colors"
              >
                Change Plan
              </button>
              
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex-1 bg-gray-800 text-white font-medium py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowPlanModal(true)}
              className="w-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-4 rounded-xl hover:opacity-90 transition-colors"
            >
              Upgrade Now
            </button>
          )}
        </div>
        
        {/* Modals */}
        {showPlanModal && <PlanSelectionModal />}
        {showCancelModal && <CancelConfirmationModal />}
      </div>
    );
  };
  
  // Password Tab Content
  const renderPasswordTab = () => {
    // Check if user is registered with Google (we'll assume Google users have a googleId)
    const isGoogleUser = user?.googleId || user?.provider === 'google';
    const hasPassword = Boolean(user?.hasPassword);
    
    if (isGoogleUser && !hasPassword) {
      return (
        <div className="bg-tiktok-dark rounded-xl p-8">
          <div className="flex items-center mb-6">
            <IoShieldOutline className="text-tiktok-pink text-3xl mr-4" />
            <h2 className="text-xl font-bold">Google Account</h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-800 p-6 rounded-xl mb-8">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8 text-white mr-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-white">You're signed in with Google</h3>
                  <p className="text-gray-400 mt-1">
                    You can set a password below to also log in with email.
                  </p>
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tiktok-blue hover:underline inline-flex items-center mt-3"
                  >
                    Manage your Google Account
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            
            <div className="flex items-center mb-6">
              <IoKeyOutline className="text-tiktok-pink text-2xl mr-3" />
              <h3 className="text-lg font-bold">Set Password for Email Login</h3>
            </div>
            
            <form onSubmit={handleChangePassword}>
              <div className="space-y-6">
                <div>
                  <label className="flex items-center text-white text-sm font-medium mb-2">
                    <IoLockClosedOutline className="mr-2 text-tiktok-pink" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                      required
                      minLength={6}
                      placeholder="Enter new password"
                    />
                    <IoLockClosedOutline className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    Minimum 6 characters
                  </p>
                </div>
                
                <div>
                  <label className="flex items-center text-white text-sm font-medium mb-2">
                    <IoLockClosedOutline className="mr-2 text-tiktok-pink" />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                      required
                      minLength={6}
                      placeholder="Confirm new password"
                    />
                    <IoLockClosedOutline className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  </div>
                  {passwordForm.newPassword !== passwordForm.confirmPassword && 
                  passwordForm.confirmPassword && (
                    <p className="flex items-center text-red-500 text-sm mt-1 ml-1">
                      <IoAlertCircleOutline className="mr-1" />
                      Passwords don't match
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center shadow-lg"
                  disabled={loading || (passwordForm.newPassword !== passwordForm.confirmPassword)}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                      Setting...
                    </>
                  ) : (
                    <>
                      <IoKeyOutline className="mr-2" />
                      Set Password
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-gray-400 text-sm mt-4">
                After setting a password, you will be able to log in using either Google or your email and password.
              </p>
            </form>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-tiktok-dark rounded-xl p-8">
        <div className="flex items-center mb-6">
          <IoLockClosedOutline className="text-tiktok-pink text-3xl mr-4" />
          <h2 className="text-xl font-bold">Change Password</h2>
        </div>
        
        <div className="max-w-3xl mx-auto">
          {isGoogleUser && hasPassword && (
            <div className="bg-gray-800 p-6 rounded-xl mb-8">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-8 w-8 text-white mr-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-white">Connected Google Account</h3>
                  <p className="text-gray-400 mt-1">
                    You can log in with either Google or your email and password.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleChangePassword}>
            <div className="space-y-6">
              {!isGoogleUser && (
                <div>
                  <label className="flex items-center text-white text-sm font-medium mb-2">
                    <IoKeyOutline className="mr-2 text-tiktok-pink" />
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                      required
                      placeholder="Enter current password"
                    />
                    <IoLockClosedOutline className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )}
              
              <div>
                <label className="flex items-center text-white text-sm font-medium mb-2">
                  <IoLockClosedOutline className="mr-2 text-tiktok-pink" />
                  New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                    required
                    minLength={6}
                    placeholder="Enter new password"
                  />
                  <IoLockClosedOutline className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  Minimum 6 characters
                </p>
              </div>
              
              <div>
                <label className="flex items-center text-white text-sm font-medium mb-2">
                  <IoLockClosedOutline className="mr-2 text-tiktok-pink" />
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                    required
                    minLength={6}
                    placeholder="Confirm new password"
                  />
                  <IoLockClosedOutline className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                </div>
                {passwordForm.newPassword !== passwordForm.confirmPassword && 
                 passwordForm.confirmPassword && (
                  <p className="flex items-center text-red-500 text-sm mt-1 ml-1">
                    <IoAlertCircleOutline className="mr-1" />
                    Passwords don't match
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center shadow-lg"
                disabled={loading || (passwordForm.newPassword !== passwordForm.confirmPassword)}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                    Changing...
                  </>
                ) : (
                  <>
                    <IoKeyOutline className="mr-2" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  // Payment Tab Content
  const renderPaymentTab = () => {
    // Helper function to format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };
    
    // Generate and download receipt as PDF
    const generateReceipt = (payment) => {
      // Create the receipt content
      const receiptContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${formatDate(payment.date)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .receipt {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 30px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #f0f0f0;
              margin-bottom: 20px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #ff0050; /* TikTok pink */
              margin-bottom: 10px;
            }
            .receipt-id {
              font-size: 14px;
              color: #777;
              margin-bottom: 5px;
            }
            .receipt-date {
              font-size: 14px;
              color: #777;
            }
            .customer-info {
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
            }
            .info-label {
              width: 120px;
              font-weight: bold;
            }
            .info-value {
              flex: 1;
            }
            .items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items th {
              background-color: #f5f5f5;
              text-align: left;
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            .items td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            .total-row {
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="logo">AI Video Generator</div>
              <div class="receipt-id">Receipt #${payment.id || 'N/A'}</div>
              <div class="receipt-date">Date: ${formatDate(payment.date)}</div>
            </div>
            
            <div class="customer-info">
              <div class="info-row">
                <div class="info-label">Customer:</div>
                <div class="info-value">${user?.name || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Email:</div>
                <div class="info-value">${user?.email || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment ID:</div>
                <div class="info-value">${payment.id || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Status:</div>
                <div class="info-value">${payment.status === 'succeeded' ? 'Paid' : 'Pending'}</div>
              </div>
            </div>
            
            <table class="items">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Plan</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>AI Video Generator Subscription</td>
                  <td>${payment.plan || 'N/A'}</td>
                  <td>$${payment.amount?.toFixed(2) || '0.00'}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">Total</td>
                  <td>$${payment.amount?.toFixed(2) || '0.00'}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>For questions or concerns regarding this receipt, please contact support@aivideos.com</p>
              <p>© ${new Date().getFullYear()} AI Video Generator, Inc. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Convert HTML to data URL
      const blob = new Blob([receiptContent], { type: 'text/html' });
      const dataUrl = URL.createObjectURL(blob);
      
      // Create a temporary link to download the file
      const downloadLink = document.createElement('a');
      downloadLink.href = dataUrl;
      downloadLink.download = `receipt-${payment.id || formatDate(payment.date)}.html`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Clean up the URL object
      setTimeout(() => URL.revokeObjectURL(dataUrl), 100);
    };
    
    // Get current plan details from either subscriptionUsage or user object
    const subscription = subscriptionUsage || user?.subscription || {
      plan: 'Free Plan',
      price: 0
    };
    
    const currentPlan = subscription.plan ? 
      (subscription.plan.toLowerCase() === 'free' || subscription.plan.toLowerCase() === 'free plan' ? 
        'Free Plan' : subscription.plan) : 
      'Free Plan';
    
    const planPrice = subscription.price || (
      currentPlan.toLowerCase() === 'starter' ? 19 :
      currentPlan.toLowerCase() === 'growth' ? 49 :
      currentPlan.toLowerCase() === 'scale' ? 95 : 0
    );
    
    // Mock payment history
    const paymentHistory = user?.subscription?.payments || subscription?.payments || [
      // If no payment history exists, show these examples in development
      ...(process.env.NODE_ENV === 'development' ? [
        { id: 'pi_123456', date: '2023-03-28', amount: planPrice, plan: currentPlan, status: 'succeeded' }
      ] : [])
    ];
    
    // Modal for adding a payment method
    const AddCardModal = () => {
      const cardNumberRef = useRef();
      const expiryMonthRef = useRef();
      const expiryYearRef = useRef();
      const cvcRef = useRef();
      const nameOnCardRef = useRef();
      
      const handleCardFormSubmit = async (e) => {
        e.preventDefault();
        setProcessingCard(true);
        setError('');
        
        try {
          // Debug user data
          console.log('Current user state:', user ? { 
            hasToken: !!user.token,
            tokenLength: user.token ? user.token.length : 0,
            id: user._id,
            email: user.email
          } : 'No user');
          
          // Get values directly from refs
          const formData = {
            cardNumber: cardNumberRef.current.value.replace(/\s/g, ''),
            expiryMonth: expiryMonthRef.current.value,
            expiryYear: expiryYearRef.current.value,
            cvc: cvcRef.current.value,
            nameOnCard: nameOnCardRef.current.value
          };
          
          // Try to get fresh user data directly from localStorage, ignore any passed user prop
          let tokenFromStorage = null;
          try {
            const storedUserData = localStorage.getItem('user');
            if (storedUserData) {
              const parsedData = JSON.parse(storedUserData);
              if (parsedData && parsedData.token) {
                console.log('Found token in localStorage with length:', parsedData.token.length);
                tokenFromStorage = parsedData.token;
              }
            }
          } catch (err) {
            console.error('Error parsing user from localStorage:', err);
          }
          
          // If we have a token from storage, use it directly
          if (tokenFromStorage) {
            console.log('Using token directly from localStorage');
            
            // Call API with the form data and token from storage
            const response = await savePaymentMethod(formData, tokenFromStorage);
            
            // Handle success
            setSuccess('Payment method added successfully!');
            setShowAddCardModal(false);
            
            // Update the user object with the returned payment method
            let updatedUserData;
            try {
              // Get the full user data from localStorage again
              const fullUserData = JSON.parse(localStorage.getItem('user'));
              
              // Create updated user data
              updatedUserData = { 
                ...fullUserData, 
                paymentMethod: response.paymentMethod || {
                  last4: formData.cardNumber.slice(-4),
                  brand: 'visa',
                  expMonth: formData.expiryMonth,
                  expYear: formData.expiryYear
                } 
              };
              
              // Update localStorage with the updated user data
              localStorage.setItem('user', JSON.stringify(updatedUserData));
              
              // Update React state with the updated user data
              setUser(updatedUserData);
            } catch (updateError) {
              console.error('Error updating user data:', updateError);
              // Continue since the payment went through
            }
            
            return; // Exit early since we succeeded
          }
          
          // If we get here, we don't have a token from localStorage
          throw new Error('Unable to find your authentication token. Please try logging out and logging back in.');
        } catch (error) {
          console.error('Payment error:', error);
          
          // Handle different types of errors
          if (error.message && error.message.includes('Authentication')) {
            setError(`Authentication error: ${error.message}. Try logging out and back in.`);
          } else if (error.response && error.response.status === 401) {
            setError('Your session has expired. Please log out and log back in to continue.');
          } else {
            setError(typeof error === 'string' ? error : (error.message || 'Failed to add payment method. Please try again.'));
          }
        } finally {
          setProcessingCard(false);
        }
      };
      
      // Format card number with spaces as user types
      const formatCardNumber = (e) => {
        let value = e.target.value.replace(/\s/g, '').substring(0, 16);
        if (value.length > 0) {
          value = value.match(new RegExp('.{1,4}', 'g')).join(' ');
        }
        e.target.value = value;
      };
      
      // Only allow digits for numeric fields
      const ensureNumeric = (e) => {
        const value = e.target.value.replace(/\D/g, '');
        e.target.value = value;
      };
      
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
          <div className="bg-tiktok-dark rounded-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Add Payment Method</h2>
              <button 
                onClick={() => setShowAddCardModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCardFormSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      ref={cardNumberRef}
                      onInput={formatCardNumber}
                      className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                      required
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                    <svg className="absolute right-3 top-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Month
                    </label>
                    <input
                      type="text"
                      ref={expiryMonthRef}
                      onInput={ensureNumeric}
                      className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                      required
                      placeholder="MM"
                      maxLength={2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      Year
                    </label>
                    <input
                      type="text"
                      ref={expiryYearRef}
                      onInput={ensureNumeric}
                      className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                      required
                      placeholder="YY"
                      maxLength={2}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-white text-sm font-medium mb-2">
                      CVC
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        ref={cvcRef}
                        onInput={ensureNumeric}
                        className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                        required
                        placeholder="123"
                        maxLength={3}
                      />
                      <svg className="absolute right-3 top-3 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"></path>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    ref={nameOnCardRef}
                    className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                    required
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center w-full"
                  disabled={processingCard}
                >
                  {processingCard ? (
                    <>
                      <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Save Card'
                  )}
                </button>
              </div>
              
              <p className="text-gray-400 text-xs text-center mt-4">
                Your card information is securely processed. We don't store your full card details.
              </p>
            </form>
          </div>
        </div>
      );
    };
    
    // Confirmation modal for deleting payment method
    const DeletePaymentMethodModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
        <div className="bg-tiktok-dark rounded-xl p-8 max-w-md w-full">
          <div className="flex items-center mb-4 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold">Remove Payment Method?</h3>
          </div>
          
          <p className="text-gray-300 mb-6">
            Are you sure you want to remove this payment method? If you have an active subscription, you'll need to add a new payment method before your next billing cycle.
          </p>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowDeletePaymentModal(false)}
              className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={() => {
                handleDeletePaymentMethod();
                setShowDeletePaymentModal(false);
              }}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center"
              disabled={processingCard}
            >
              {processingCard ? (
                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
              ) : (
                'Remove'
              )}
            </button>
          </div>
        </div>
      </div>
    );
    
    return (
      <div className="space-y-8">
        {/* Payment Method */}
        <div className="bg-tiktok-dark rounded-xl p-8">
          <h2 className="text-xl font-bold mb-6">Payment Method</h2>
          
          {user?.paymentMethod ? (
            <div className="bg-gray-800 p-5 rounded-xl flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-16 bg-gray-700 rounded mr-4 flex items-center justify-center">
                  {/* Card brand logo would go here */}
                  <span className="text-white font-medium">VISA</span>
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• {user.paymentMethod.last4}</p>
                  <p className="text-gray-400 text-sm">Expires {user.paymentMethod.expMonth}/{user.paymentMethod.expYear}</p>
                </div>
              </div>
              
              <div>
                <button 
                  onClick={() => setShowAddCardModal(true)}
                  className="text-tiktok-pink hover:text-tiktok-blue transition-colors mr-4"
                >
                  Update
                </button>
                <button 
                  onClick={() => setShowDeletePaymentModal(true)} 
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-6 rounded-xl text-center">
              <p className="text-gray-400 mb-4">No payment method on file</p>
              <button 
                onClick={() => setShowAddCardModal(true)}
                className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-2 px-6 rounded-lg hover:opacity-90 transition-colors"
              >
                Add Payment Method
              </button>
            </div>
          )}
        </div>
        
        {/* Billing History */}
        <div className="bg-tiktok-dark rounded-xl p-8">
          <h2 className="text-xl font-bold mb-6">Payment History</h2>
          
          {paymentHistory.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-700">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Receipt</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800/30 divide-y divide-gray-800">
                  {paymentHistory.map((payment, idx) => (
                    <tr key={payment.id || idx} className="hover:bg-gray-800">
                      <td className="px-4 py-4 text-sm">{formatDate(payment.date)}</td>
                      <td className="px-4 py-4 text-sm">${payment.amount}</td>
                      <td className="px-4 py-4 text-sm">{payment.plan}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'succeeded' 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {payment.status === 'succeeded' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <button 
                          onClick={() => generateReceipt(payment)}
                          className="text-tiktok-blue hover:text-tiktok-pink transition-colors"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-800 p-6 rounded-xl text-center">
              <p className="text-gray-400">No payment history available</p>
            </div>
          )}
        </div>
        
        {/* Add Card Modal */}
        {showAddCardModal && <AddCardModal />}
        
        {/* Delete Payment Method Modal */}
        {showDeletePaymentModal && <DeletePaymentMethodModal />}
      </div>
    );
  };
  
  // Delete Account Confirmation
  const DeleteConfirmation = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
      <div className="bg-tiktok-dark rounded-xl p-8 max-w-md w-full">
        <div className="flex items-center mb-4 text-red-500">
          <IoWarningOutline className="text-3xl mr-3" />
          <h3 className="text-xl font-bold">Delete Your Account?</h3>
        </div>
        
        <p className="text-gray-300 mb-6">
          This action <span className="text-red-500 font-bold">cannot be undone</span>. 
          All your data, videos, and subscription information will be permanently deleted.
        </p>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowDeleteAccountConfirmation(false)}
            className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleDeleteAccount}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
            ) : (
              <>
                <IoTrashOutline className="mr-2" />
                Delete My Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
  
  if (loading && !profileForm.name) {
    return (
      <div className="min-h-screen bg-black pt-0 px-4 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-tiktok-pink border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400">Loading your account settings...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black pt-0 px-4">
      <div className="max-w-5xl mx-auto py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
            Account Settings
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Manage your profile, security, and account preferences
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-tiktok-dark rounded-full p-1">
            <button
              onClick={() => handleTabChange('profile')}
              className={`px-5 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => handleTabChange('password')}
              className={`px-5 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                activeTab === 'password'
                  ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => handleTabChange('subscription')}
              className={`px-5 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                activeTab === 'subscription'
                  ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Subscription
            </button>
            <button
              onClick={() => handleTabChange('payment')}
              className={`px-5 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                activeTab === 'payment'
                  ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Payment
            </button>
            <button
              onClick={() => handleTabChange('danger')}
              className={`px-5 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                activeTab === 'danger'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Delete Account
            </button>
          </div>
        </div>
        
        {/* Status messages */}
        {success && (
          <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500 text-green-500 p-4 rounded-xl mb-6 flex items-center animate-fadeIn">
            <IoCheckmarkCircleOutline className="text-xl mr-2 flex-shrink-0" />
            <p>{success}</p>
          </div>
        )}
        
        {error && (
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500 text-red-500 p-4 rounded-xl mb-6 flex items-center animate-fadeIn">
            <IoAlertCircleOutline className="text-xl mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-tiktok-dark rounded-xl p-8">
            <div className="flex items-center mb-6">
              <IoPersonOutline className="text-tiktok-pink text-3xl mr-4" />
              <h2 className="text-xl font-bold">Edit Profile</h2>
            </div>
            
            <div className="max-w-3xl mx-auto">
              {/* Avatar and Form Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Avatar Section */}
                <div className="md:col-span-1 flex flex-col items-center justify-center">
                  <div className="relative mb-3">
                    <div
                      className="w-28 h-28 rounded-full overflow-hidden border-4 border-tiktok-pink cursor-pointer group relative"
                      onClick={handleAvatarClick}
                    >
                      {avatar ? (
                        <img 
                          src={avatar} 
                          alt={profileForm.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink flex items-center justify-center">
                          <span className="text-white text-4xl font-bold">
                            {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploadingAvatar ? (
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <IoCloudUploadOutline className="text-white text-2xl" />
                        )}
                      </div>
                    </div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </div>
                  
                  <p className="text-center text-gray-400 text-sm">
                    Click to upload profile photo
                  </p>
                  
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                      Recommended: Square JPG, PNG<br />
                      Minimum 400x400 pixels
                    </p>
                  </div>
                </div>
                
                {/* Form Section */}
                <div className="md:col-span-2">
                  <form onSubmit={handleUpdateProfile}>
                    <div className="space-y-5">
                      <div>
                        <label className="flex items-center text-white text-sm font-medium mb-2">
                          <IoPersonOutline className="mr-2 text-tiktok-pink" />
                          Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="name"
                            value={profileForm.name}
                            onChange={handleProfileChange}
                            className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                            required
                            placeholder="Your name"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="flex items-center text-white text-sm font-medium mb-2">
                          <IoMailOutline className="mr-2 text-tiktok-pink" />
                          Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            name="email"
                            value={profileForm.email}
                            onChange={handleProfileChange}
                            className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                            required
                            placeholder="Your email"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="flex items-center text-white text-sm font-medium mb-2">
                          <IoCallOutline className="mr-2 text-tiktok-pink" />
                          Phone (optional)
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            name="phone"
                            value={profileForm.phone}
                            onChange={handleProfileChange}
                            className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                            placeholder="Your phone number"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="flex items-center text-white text-sm font-medium mb-2">
                          <IoBriefcaseOutline className="mr-2 text-tiktok-pink" />
                          Company (optional)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            name="company"
                            value={profileForm.company}
                            onChange={handleProfileChange}
                            className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                            placeholder="Your company"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-8 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center shadow-lg w-full"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <IoSaveOutline className="mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Password Tab */}
        {activeTab === 'password' && renderPasswordTab()}
        
        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="bg-tiktok-dark rounded-xl p-8">
            <div className="flex items-center mb-6">
              <IoShieldOutline className="text-tiktok-pink text-3xl mr-4" />
              <h2 className="text-xl font-bold">Subscription</h2>
            </div>
            
            <div className="max-w-3xl mx-auto">
              {renderSubscriptionTab()}
            </div>
          </div>
        )}
        
        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="bg-tiktok-dark rounded-xl p-8">
            <div className="flex items-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="text-tiktok-pink h-7 w-7 mr-3">
                <path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
              <h2 className="text-xl font-bold">Payment Methods</h2>
            </div>
            
            <div className="max-w-3xl mx-auto">
              {renderPaymentTab()}
            </div>
          </div>
        )}
        
        {/* Danger Zone */}
        {activeTab === 'danger' && (
          <div className="bg-gradient-to-br from-red-900/30 to-red-700/10 border border-red-900 rounded-xl p-8">
            <div className="flex items-center mb-6">
              <IoWarningOutline className="text-red-500 text-3xl mr-4" />
              <h2 className="text-xl font-bold text-red-500">Delete Account</h2>
            </div>
            
            <div className="bg-black bg-opacity-30 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-medium text-red-400 mb-4">Warning: This action cannot be undone</h3>
              <p className="text-gray-300 mb-4">
                Deleting your account will:
              </p>
              
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Permanently remove all your videos and content</li>
                <li>Cancel any active subscriptions</li>
                <li>Delete your profile and personal information</li>
                <li>Remove your access to the platform</li>
              </ul>
              
              <p className="text-gray-400 text-sm">
                If you're having issues with your account, consider contacting support before deletion.
              </p>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => setShowDeleteAccountConfirmation(true)}
                className="bg-red-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-red-700 transition-colors flex items-center"
              >
                <IoTrashOutline className="mr-2" />
                Delete My Account
              </button>
            </div>
          </div>
        )}
        
        {/* Delete confirmation dialog */}
        {showDeleteAccountConfirmation && <DeleteConfirmation />}
      </div>
    </div>
  );
};

// Add keyframe animations
const styles = document.createElement('style');
styles.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
`;
document.head.appendChild(styles);

export default Account; 