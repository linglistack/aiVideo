import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getProfile, refreshToken, updateProfile, changePassword, deleteAccount } from '../../services/authService';
import { savePaymentMethod, getPaymentMethods, deletePaymentMethod, getPaymentHistory, setDefaultPaymentMethod } from '../../services/paymentService';
import { cancelSubscription, createBillingPortalSession } from '../../services/subscriptionService';
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
  IoDownloadOutline,
  IoCalendarOutline,
  IoTimeOutline,
  IoCashOutline,
  IoStarOutline,
  IoVideocamOutline,
  IoSpeedometerOutline,
  IoHeadsetOutline,
  IoCheckmarkOutline
} from 'react-icons/io5';
import * as subscriptionService from '../../services/subscriptionService';
import * as authService from '../../services/authService';
import { FaPaypal, FaCreditCard, FaCcVisa, FaCcMastercard, FaCcAmex, FaCcDiscover } from 'react-icons/fa';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const Account = ({ user, setUser, subscriptionUsage, loadingUsage, setSubscriptionUsage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeleteAccountConfirmation, setShowDeleteAccountConfirmation] = useState(false);
  const [processingCard, setProcessingCard] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [showPlanSelectionModal, setShowPlanSelectionModal] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly');
  const [cancelReason, setCancelReason] = useState('');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const fileInputRef = useRef(null);
  
  // Payment tab state
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    nameOnCard: ''
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  
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
                updatedUser.paymentMethods = paymentResponse.methods;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                // Update app state if we aren't already using user from profile response
                if (!profileResponse.success) {
                  setUser(updatedUser);
                }
              }
            }
          } else if (user?.paymentMethods && user.paymentMethods.length > 0) {
            // If no API call but user already has payment methods, use those
            setPaymentMethods(user.paymentMethods);
          }
        } catch (error) {
          console.error('Failed to load payment methods:', error);
          
          // Fallback to using payment methods from user object if API fails
          if (user?.paymentMethods && user.paymentMethods.length > 0) {
            setPaymentMethods(user.paymentMethods);
          }
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
  
  // Fetch payment history from server
  const fetchPaymentHistory = async () => {
    try {
      setLoadingPaymentHistory(true);
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
        console.warn('No token available to fetch payment history');
        return;
      }
      
      console.log('Fetching payment history...');
      const response = await getPaymentHistory(token);
      
      if (response.success && response.payments) {
        console.log('Payment history fetched:', response.payments);
        setPaymentHistory(response.payments);
      } else {
        console.warn('No payment history returned from API');
        // If API call succeeds but returns no payments, set empty array
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      // On error, don't update state so we keep any existing payment history
    } finally {
      setLoadingPaymentHistory(false);
    }
  };
  
  // Use effect to fetch payment history when payment tab is active
  useEffect(() => {
    if (activeTab === 'payment') {
      fetchPaymentHistory();
    }
  }, [activeTab]);
  
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
    // If we already have payment methods in state, don't refetch
    if (paymentMethods && paymentMethods.length > 0) {
      return;
    }
    
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
        // Fallback to using payment methods from user object
        if (user?.paymentMethods && user.paymentMethods.length > 0) {
          setPaymentMethods(user.paymentMethods);
        }
        return;
      }
      
      const response = await getPaymentMethods(token);
      if (response.success && response.methods) {
        setPaymentMethods(response.methods);
        
        // If payment methods were fetched, update the user state without localStorage
        if (response.methods.length > 0) {
          // Only update user state if needed
          if (!user.paymentMethods || 
              JSON.stringify(user.paymentMethods) !== JSON.stringify(response.methods)) {
            const updatedUser = { ...user };
            // Find the default payment method or use the first one
            const defaultMethod = response.methods.find(m => m.isDefault) || response.methods[0];
            updatedUser.paymentMethod = defaultMethod;
            updatedUser.paymentMethods = response.methods;
            setUser(updatedUser);
          }
        }
      } else {
        // Fallback to using payment methods from user object
        if (user?.paymentMethods && user.paymentMethods.length > 0) {
          setPaymentMethods(user.paymentMethods);
        }
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error);
      // Fallback to using payment methods from user object
      if (user?.paymentMethods && user.paymentMethods.length > 0) {
        setPaymentMethods(user.paymentMethods);
      }
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
  
  // Handle avatar upload - now properly uploads to server
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingAvatar(true);
      
      // Create a local preview
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
      
      // Store the file for later upload
      setAvatarFile(file);
      
      // Also update local state for UI
      setAvatar(objectUrl);
      setUploadingAvatar(false);
      
      // Reset file input
      e.target.value = null;
    }
  };
  
  // Update profile with avatar
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      // Create form data to handle file upload
      const formData = new FormData();
      
      // Add profile form fields
      Object.keys(profileForm).forEach(key => {
        formData.append(key, profileForm[key]);
      });
      
      // Add avatar file if exists
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      
      // Use the imported updateProfile service
      const response = await updateProfile(formData);
      
      if (response.success) {
        setSuccess('Profile updated successfully!');
        
        // Update user state with the response data
        setUser(response.user);
        
        // Update avatar state
        if (response.user.avatar) {
          setAvatar(response.user.avatar);
        }
        
        // Clear the file after successful upload
        setAvatarFile(null);
        
        // Auto dismiss success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (error) {
      setError(error.message || 'Failed to update profile');
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
  const handleDeletePaymentMethod = async (paymentMethodId) => {
    setProcessingCard(true);
    setError('');
    setSuccess('');
    
    try {
      // Make sure we have a payment method ID
      if (!paymentMethodId) {
        if (user?.paymentMethod?.id) {
          paymentMethodId = user.paymentMethod.id;
        } else {
          throw new Error('No payment method ID provided');
        }
      }
      
      // Ensure we have a string ID, not an object
      const methodId = typeof paymentMethodId === 'object' ? paymentMethodId.id : paymentMethodId;
      
      // Call API to delete the payment method
      await deletePaymentMethod(methodId, user.token);
      
      // Update the user object to remove the payment method
      const updatedUser = { ...user };
      
      // If deleting the default payment method
      if (updatedUser.paymentMethod && updatedUser.paymentMethod.id === methodId) {
        delete updatedUser.paymentMethod;
      }
      
      // Remove from the payment methods array
      if (updatedUser.paymentMethods && Array.isArray(updatedUser.paymentMethods)) {
        updatedUser.paymentMethods = updatedUser.paymentMethods.filter(
          method => method.id !== methodId
        );
        
        // If we deleted the default and have other payment methods, set the first one as default
        if (!updatedUser.paymentMethod && updatedUser.paymentMethods.length > 0) {
          updatedUser.paymentMethod = updatedUser.paymentMethods[0];
          
          // Also update the default in the database
          try {
            await setDefaultPaymentMethod(updatedUser.paymentMethod.id, user.token);
          } catch (error) {
            console.error('Error setting new default payment method:', error);
            // Continue anyway
          }
        }
      }
      
      // Update local storage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Also update the paymentMethods state to reflect the change immediately in UI
      setPaymentMethods(prevMethods => {
        if (!prevMethods) return [];
        return prevMethods.filter(method => method.id !== methodId);
      });
      
      setSuccess('Payment method removed successfully!');
    } catch (error) {
      setError(typeof error === 'string' ? error : 'Failed to remove payment method. Please try again.');
      console.error(error);
    } finally {
      setProcessingCard(false);
      setSelectedPaymentMethod(null);
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
      isActive: false,
      startDate: null,
      renewDate: null
    };

    // Get current plan details - ensure "Free Plan" is properly capitalized
    const currentPlan = subscription.plan ? 
      (subscription.plan.toLowerCase() === 'free' || subscription.plan.toLowerCase() === 'free plan' ? 
        'Free Plan' : subscription.plan) : 
      'Free Plan';
      
    const isFreePlan = currentPlan === 'Free Plan' || !subscription || subscription.plan?.toLowerCase() === 'free';
    // Determine if subscription is actually active - check both isActive flag and cancelAtPeriodEnd
    const isSubscriptionActive = subscription.isActive && !subscription.cancelAtPeriodEnd && !subscription.isCanceled;
    const planPrice = subscription.price || (
      currentPlan.toLowerCase() === 'starter' ? 19 :
      currentPlan.toLowerCase() === 'growth' ? 49 :
      currentPlan.toLowerCase() === 'scale' ? 95 : 0
    );
    const planStatus = subscription.cancelAtPeriodEnd || subscription.isCanceled 
      ? 'canceled' 
      : (subscription.status || subscription.isActive ? 'active' : 'inactive');
    const startDate = subscription.startDate;
    const nextBillingDate = subscription.renewDate || subscription.endDate;
    
    // Determine subscription status display and UI elements
    const determineSubscriptionStatus = () => {
      // Explicitly canceled but still active until end of period
      if (subscription.cancelAtPeriodEnd || subscription.isCanceled) {
        return {
          status: 'canceled',
          statusText: 'Canceled',
          statusClass: 'bg-red-500/20 text-red-500',
          showCancelButton: false,
          accessEndsLabel: 'Access Until',
          nextDateLabel: 'Access Until'
        };
      } 
      // Active subscription
      else if (subscription.isActive) {
        return {
          status: 'active',
          statusText: 'Active',
          statusClass: 'bg-green-500/20 text-green-500',
          showCancelButton: true,
          accessEndsLabel: 'Next Billing Date',
          nextDateLabel: 'Next Billing Date'
        };
      }
      // Inactive subscription (free tier or expired)
      else {
        return {
          status: 'inactive',
          statusText: 'Inactive',
          statusClass: 'bg-yellow-500/20 text-yellow-500',
          showCancelButton: false,
          accessEndsLabel: 'End Date',
          nextDateLabel: 'End Date'
        };
      }
    };
    
    // Get subscription status information
    const statusInfo = determineSubscriptionStatus();
    
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
      setProcessingCard(true);
      
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
        setProcessingCard(false);
        setShowPlanSelectionModal(false);
      }
    };

    // Handle cancel subscription
    const handleCancelSubscription = async () => {
      setProcessingCard(true);
      
      try {
        // Call API to cancel subscription
        const response = await subscriptionService.cancelSubscription({
          reason: cancelReason || 'No reason provided'
        });
        
        if (response.success) {
          // Update the user object
          const updatedUser = { ...user };
          if (updatedUser.subscription) {
            updatedUser.subscription.cancelAtPeriodEnd = true;
            updatedUser.subscription.isCanceled = true;
            updatedUser.subscription.willCancelAt = response.cancelDate;
          }
          
          // Update localStorage and state
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          
          setSuccess('Your subscription has been canceled. You will have access until the end of your current billing period.');
          setShowCancelConfirmation(false);
          
          // Refresh subscription usage if available
          if (typeof setSubscriptionUsage === 'function') {
            try {
              if (typeof loadingUsage === 'function') {
                loadingUsage(true);
              }
              
              const usageResponse = await subscriptionService.getSubscriptionUsage();
              if (usageResponse && usageResponse.success) {
                if (typeof setSubscriptionUsage === 'function') {
                  // Update subscription usage state with cancellation flags
                  setSubscriptionUsage({
                    ...usageResponse.usage,
                    cancelAtPeriodEnd: true,
                    isCanceled: true
                  });
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
        } else {
          setError(response.error || 'Failed to cancel subscription. Please try again.');
        }
      } catch (error) {
        setError('Failed to cancel subscription. Please try again.');
        console.error('Cancel subscription error:', error);
      } finally {
        setProcessingCard(false);
      }
    };

    // Inside renderSubscriptionTab function, add this modal component definition
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
              <h2 className="text-2xl font-bold">{subscription.cancelAtPeriodEnd ? 'Resubscribe' : 'Change Your Plan'}</h2>
              <button 
                onClick={() => setShowPlanSelectionModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">
              {subscription.cancelAtPeriodEnd 
                ? 'Choose a plan to continue your subscription. Your new plan will start immediately.'
                : 'You can upgrade or downgrade your plan at any time. If you upgrade, you\'ll be charged the prorated difference immediately. If you downgrade, your new plan will take effect at the end of your current billing cycle.'}
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
                      isCurrentPlan && !subscription.cancelAtPeriodEnd
                        ? 'border-tiktok-pink' 
                        : 'border-gray-800 hover:border-gray-700'
                    } transition-all`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      {isCurrentPlan && !subscription.cancelAtPeriodEnd && (
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
                      disabled={(isCurrentPlan && !subscription.cancelAtPeriodEnd) || processingCard}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        (isCurrentPlan && !subscription.cancelAtPeriodEnd)
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white hover:opacity-90'
                      }`}
                    >
                      {processingCard ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                          Processing...
                        </div>
                      ) : (isCurrentPlan && !subscription.cancelAtPeriodEnd) ? (
                        'Current Plan'
                      ) : subscription.cancelAtPeriodEnd ? (
                        'Select Plan'
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
                <div className="flex justify-center space-x-1">
                  {/* Credit Card */}
                  <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <rect x="1" y="4" width="22" height="16" rx="2" strokeWidth="1.5" stroke="currentColor" />
                      <line x1="1" y1="10" x2="23" y2="10" strokeWidth="1.5" stroke="currentColor" />
                      <line x1="4" y1="16" x2="10" y2="16" strokeWidth="1.5" stroke="currentColor" />
                    </svg>
                  </div>
                  
                  {/* PayPal */}
                  <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center justify-center">
                    <img 
                      src="https://www.paypalobjects.com/digitalassets/c/website/marketing/apac/C2/logos-buttons/optimize/44_Grey_PayPal_Pill_Button.png" 
                      alt="PayPal" 
                      className="h-6"
                    />
                  </div>
                  
                  {/* Apple Pay */}
                  <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="h-6" fill="white">
                      <path d="M17.05 12.536c-.021-2.307 1.894-3.41 1.98-3.467-1.077-1.577-2.757-1.792-3.353-1.818-1.428-.145-2.79.84-3.511.84-.723 0-1.84-.82-3.026-.797-1.558.022-2.994.906-3.797 2.3-1.616 2.802-.413 6.934 1.161 9.204.77 1.112 1.687 2.358 2.888 2.313 1.16-.046 1.597-.75 2.996-.75 1.401 0 1.795.75 3.025.726 1.249-.02 2.04-1.137 2.803-2.253.884-1.29 1.248-2.543 1.269-2.607-.029-.013-2.435-.935-2.459-3.703-.004-1.005.39-1.857 1.024-2.488z"/>
                      <path d="M15.315 6.403c.64-.776 1.071-1.854.953-2.926-.92.037-2.04.613-2.7 1.384-.593.688-1.113 1.786-.973 2.84 1.026.08 2.08-.522 2.72-1.298z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-8">
        {/* Current Plan & Summary */}
        <div className="bg-gradient-to-br from-gray-900 to-tiktok-dark rounded-xl p-8 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-tiktok-blue to-tiktok-pink rounded-full p-2 mr-4">
                <IoShieldOutline className="text-white text-3xl" />
              </div>
              <div>
              <h2 className="text-xl font-bold">{currentPlan}</h2>
                <p className="text-gray-400 text-sm">Your current subscription</p>
            </div>
            </div>
            <span className={`${statusInfo.statusClass} px-3 py-1 rounded-full text-sm font-medium flex items-center`}>
              {statusInfo.status === 'active' && <span className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>}
              {statusInfo.status === 'canceled' && <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>}
              {statusInfo.status === 'inactive' && <span className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></span>}
              {statusInfo.statusText}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-700/10 border border-blue-900/30 p-4 rounded-lg flex flex-col relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20 hover:-translate-y-1">
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-blue-500 to-tiktok-blue rounded-bl-full opacity-20 transition-opacity group-hover:opacity-40"></div>
              <p className="text-gray-400 text-sm mb-1 flex items-center">
                <IoCalendarOutline className="text-blue-400 mr-2" />
                Billing Cycle
              </p>
              <p className="text-lg font-medium text-white capitalize">{subscription.billingCycle || 'Monthly'}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-700/10 border border-purple-900/30 p-4 rounded-lg flex flex-col relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/20 hover:-translate-y-1">
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-purple-500 to-tiktok-pink rounded-bl-full opacity-20 transition-opacity group-hover:opacity-40"></div>
              <p className="text-gray-400 text-sm mb-1 flex items-center">
                <IoCalendarOutline className="text-purple-400 mr-2" />
                Start Date
              </p>
              <p className="text-lg font-medium text-white">{formatDate(startDate)}</p>
            </div>
            
            <div className="bg-gradient-to-br from-tiktok-pink/30 to-pink-700/10 border border-pink-900/30 p-4 rounded-lg flex flex-col relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-pink-900/20 hover:-translate-y-1">
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-pink-500 to-tiktok-pink rounded-bl-full opacity-20 transition-opacity group-hover:opacity-40"></div>
              <p className="text-gray-400 text-sm mb-1 flex items-center">
                <IoTimeOutline className="text-pink-400 mr-2" />
                {statusInfo.nextDateLabel}
              </p>
              <p className="text-lg font-medium text-white">
                {formatDate(nextBillingDate)}
                {statusInfo.status === 'canceled' && 
                  <span className="block text-xs text-red-400 mt-1">
                    Your subscription will end on this date
                  </span>
                }
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-900/30 to-green-700/10 border border-green-900/30 p-4 rounded-lg flex flex-col relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-green-900/20 hover:-translate-y-1">
              <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-bl-full opacity-20 transition-opacity group-hover:opacity-40"></div>
              <p className="text-gray-400 text-sm mb-1 flex items-center">
                <IoCashOutline className="text-green-400 mr-2" />
                Price
              </p>
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
          
          {/* Features for current plan */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <IoStarOutline className="text-tiktok-pink mr-2" />
              Your Plan Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center bg-black/30 p-3 rounded-lg group transition-colors hover:bg-black/40">
                <div className="bg-gradient-to-br from-tiktok-blue to-blue-600 p-2 rounded-full mr-3">
                  <IoVideocamOutline className="text-white text-xl" />
            </div>
                <div>
                  <p className="font-medium text-white">{videosLimit} videos</p>
                  <p className="text-gray-400 text-sm">per month</p>
            </div>
              </div>
              
              {userPlanDetails && userPlanDetails.features && userPlanDetails.features.map((feature, idx) => (
                <div key={idx} className="flex items-center bg-black/30 p-3 rounded-lg group transition-colors hover:bg-black/40">
                  <div className={`bg-gradient-to-br ${
                    idx % 3 === 0 ? 'from-green-500 to-teal-600' : 
                    idx % 3 === 1 ? 'from-purple-500 to-indigo-600' : 
                    'from-tiktok-pink to-red-600'
                  } p-2 rounded-full mr-3`}>
                    {idx % 3 === 0 ? (
                      <IoCheckmarkOutline className="text-white text-xl" />
                    ) : idx % 3 === 1 ? (
                      <IoSpeedometerOutline className="text-white text-xl" />
                    ) : (
                      <IoHeadsetOutline className="text-white text-xl" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">{feature}</p>
                  </div>
                </div>
              ))}
              
              {/* <div className="flex items-center bg-black/30 p-3 rounded-lg group transition-colors hover:bg-black/40">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-full mr-3">
                  <IoCloudUploadOutline className="text-white text-xl" />
                </div>
                <div>
                  <p className="font-medium text-white">{userPlanDetails?.storage || '5GB'}</p>
                  <p className="text-gray-400 text-sm">storage</p>
                </div>
              </div> */}
            </div>
          </div>
          
          {/* Show different action buttons based on subscription status */}
          {statusInfo.status === 'canceled' ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <p className="text-red-400 mb-2">
                <span className="font-medium">Your subscription has been canceled</span> but you still have access until {formatDate(nextBillingDate)}.
              </p>
              <p className="text-sm text-gray-400">
                Want to stay with us? You can resubscribe below.
              </p>
              <button
                onClick={() => setShowPlanSelectionModal(true)}
                className="mt-4 bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-4 rounded-xl hover:opacity-90 transition-colors w-full"
              >
                Resubscribe Now
              </button>
            </div>
          ) : !isFreePlan ? (
            <div className="flex space-x-4">
              <button
                onClick={() => setShowPlanSelectionModal(true)}
                className="flex-1 bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-4 rounded-xl hover:opacity-90 transition-colors"
              >
                Change Plan
              </button>
              
              {statusInfo.showCancelButton && (
                <button
                  onClick={() => setShowCancelConfirmation(true)}
                  className="flex-1 bg-gray-800 text-white font-medium py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowPlanSelectionModal(true)}
              className="w-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-4 rounded-xl hover:opacity-90 transition-colors"
            >
              Upgrade Now
            </button>
          )}
        </div>
        
        {/* Modals */}
        {showPlanSelectionModal && <PlanSelectionModal />}
        {showCancelConfirmation && <CancelConfirmationModal />}
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
    
    return (
      <div className="space-y-8">
        {/* Payment Methods Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-tiktok-blue to-tiktok-pink p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="text-white h-6 w-6">
                  <path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Payment Methods</h2>
                <p className="text-gray-400 text-sm">Manage your payment options</p>
              </div>
          </div>
          
            {/* Only show this button when there are already payment methods */}
            {paymentMethods && paymentMethods.length > 0 && (
              <button 
                onClick={() => setShowAddCardModal(true)}
                className="flex items-center text-sm bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white py-2 px-4 rounded-xl transition-all hover:opacity-90"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add New Card
              </button>
            )}
          </div>
          
          {paymentMethods && paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method, index) => (
                <PaymentMethodCard
                  key={index}
                  paymentMethod={method}
                  isDefault={user.paymentMethod && user.paymentMethod.id === method.id}
                  onDelete={() => handleDeletePaymentMethod(method.id)}
                  onMakeDefault={() => handleMakeDefaultPaymentMethod(method)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-black/30 rounded-xl p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <div className="absolute -top-2 -right-2 bg-tiktok-pink rounded-full h-8 w-8 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">No Payment Methods</h3>
              <p className="text-gray-400 mb-6">You haven't added any payment methods yet.</p>
              <button 
                onClick={() => setShowAddCardModal(true)}
                className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white py-3 px-6 rounded-xl hover:opacity-90 transition-opacity inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Payment Method
              </button>
            </div>
          )}
          
          {/* Payment types information */}
          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center bg-gray-900 px-4 py-2 rounded-lg">
                <FaCcVisa className="text-blue-500 text-2xl mr-2" />
                <FaCcMastercard className="text-red-500 text-2xl mr-2" />
                <FaCcAmex className="text-blue-600 text-2xl mr-2" />
                <FaCcDiscover className="text-orange-500 text-2xl" />
              </div>
              <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center justify-center">
                <FaPaypal className="text-blue-500 text-2xl" />
              </div>
              <div className="bg-gray-900 px-4 py-2 rounded-lg flex items-center">
                <svg viewBox="0 0 24 24" className="h-6 mr-2" fill="white">
                  <path d="M17.05 12.536c-.021-2.307 1.894-3.41 1.98-3.467-1.077-1.577-2.757-1.792-3.353-1.818-1.428-.145-2.79.84-3.511.84-.723 0-1.84-.82-3.026-.797-1.558.022-2.994.906-3.797 2.3-1.616 2.802-.413 6.934 1.161 9.204.77 1.112 1.687 2.358 2.888 2.313 1.16-.046 1.597-.75 2.996-.75 1.401 0 1.795.75 3.025.726 1.249-.02 2.04-1.137 2.803-2.253.884-1.29 1.248-2.543 1.269-2.607-.029-.013-2.435-.935-2.459-3.703z"/>
                  <path d="M15.315 6.403c.64-.776 1.071-1.854.953-2.926-.92.037-2.04.613-2.7 1.384-.593.688-1.113 1.786-.973 2.84 1.026.08 2.08-.522 2.72-1.298z"/>
                </svg>
                <span className="text-white">Apple Pay</span>
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-gray-500 text-xs">Secure payments powered by Stripe</p>
            </div>
          </div>
        </div>
          
        {/* Billing History Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-br from-green-500 to-teal-500 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="text-white h-6 w-6">
                <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.11.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM16 18H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              </div>
              <div>
              <h2 className="text-xl font-semibold">Billing History</h2>
                <p className="text-gray-400 text-sm">View and download your receipts</p>
            </div>
            </div>
            
            {/* Export all receipts button - Only show if there's payment history */}
            {/* {paymentHistory.length > 0 && (
              <button 
                onClick={() => {
                  // You could implement a "download all receipts" feature here
                  setSuccess('All receipts exported successfully!');
                }}
                className="flex items-center text-sm border border-teal-500 text-teal-500 bg-teal-500/10 py-2 px-4 rounded-xl transition-all hover:bg-teal-500/20"
              >
                <IoDownloadOutline className="mr-1" />
                Export All
              </button>
            )} */}
          </div>
          
          {loadingPaymentHistory ? (
            <div className="bg-black/30 rounded-xl p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-10 h-10 border-t-2 border-b-2 border-tiktok-pink rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-400">Loading payment history...</p>
            </div>
          ) : paymentHistory.length > 0 ? (
            <div className="bg-black/30 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/50 text-left">
                    <tr>
                      <th className="py-3 px-4 text-gray-400 font-medium text-sm">Date</th>
                      <th className="py-3 px-4 text-gray-400 font-medium text-sm">Amount</th>
                      <th className="py-3 px-4 text-gray-400 font-medium text-sm">Plan</th>
                      <th className="py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                      <th className="py-3 px-4 text-gray-400 font-medium text-sm text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((payment, idx) => (
                      <tr key={payment.id || idx} className="border-t border-gray-800 hover:bg-gray-900/30 transition-colors">
                        <td className="py-4 px-4">{formatDate(payment.date)}</td>
                        <td className="py-4 px-4 font-medium">${payment.amount}</td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center">
                            <span className={`h-2 w-2 rounded-full mr-2 ${
                              payment.plan?.toLowerCase()?.includes('starter') ? 'bg-blue-500' :
                              payment.plan?.toLowerCase()?.includes('growth') ? 'bg-purple-500' :
                              payment.plan?.toLowerCase()?.includes('scale') ? 'bg-tiktok-pink' : 'bg-gray-500'
                            }`}></span>
                            {payment.plan || 'Unknown Plan'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'succeeded' 
                              ? 'bg-green-500/20 text-green-500' 
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {payment.status === 'succeeded' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button 
                            onClick={() => generateReceipt(payment)}
                            className="inline-flex items-center justify-center bg-gradient-to-r from-teal-500 to-green-500 text-white py-1.5 px-4 rounded-full hover:opacity-90 transition-all group"
                          >
                            <IoDownloadOutline className="mr-1.5 group-hover:animate-bounce" />
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-black/30 rounded-xl p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="bg-gray-900/70 p-4 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">No Billing History</h3>
              <p className="text-gray-400">Your payment history will appear here once you've made a payment</p>
              <button 
                onClick={fetchPaymentHistory} 
                className="mt-4 flex items-center justify-center mx-auto bg-gray-800 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <IoReloadOutline className="mr-2" />
                Refresh
              </button>
            </div>
          )}
        </div>
        

        
        {/* Modals */}
        {showAddCardModal && (
          <Elements stripe={stripePromise}>
            <AddCardModal 
              show={showAddCardModal}
              onClose={() => setShowAddCardModal(false)}
              onAddCard={handleAddCard}
              onAddPayPal={handleAddPayPal}
              processingCard={processingCard}
            />
          </Elements>
        )}
        
        <DeletePaymentMethodModal
          show={showDeletePaymentModal}
          onClose={() => setShowDeletePaymentModal(false)}
          onConfirm={confirmDeletePaymentMethod}
          paymentMethod={selectedPaymentMethod}
        />
        
        <PlanSelectionModal
          show={showPlanSelectionModal}
          onClose={() => setShowPlanSelectionModal(false)}
          onSelectPlan={handlePlanSelection}
          selectedPlanId={selectedPlanId}
          selectedBillingCycle={selectedBillingCycle}
          onChangeBillingCycle={setSelectedBillingCycle}
        />
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
  
  // Confirmation modal for deleting payment method
  const DeletePaymentMethodModal = ({ show, onClose, onConfirm, paymentMethod }) => {
    if (!show) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
        <div className="bg-tiktok-dark rounded-xl p-8 max-w-md w-full">
          <div className="flex items-center mb-4 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-xl font-bold">Remove Payment Method?</h3>
              </div>
          
          <p className="text-gray-300 mb-6">
            Are you sure you want to remove{' '}
            {paymentMethod ? (
              <span className="font-medium">
                {paymentMethod.type === 'paypal'
                  ? 'PayPal'
                  : paymentMethod.type === 'apple_pay'
                  ? 'Apple Pay'
                  : paymentMethod.type === 'google_pay'
                  ? 'Google Pay'
                  : paymentMethod.type === 'express_checkout'
                  ? paymentMethod.brand === 'apple_pay' ? 'Apple Pay' : 'Google Pay'
                  : `${paymentMethod.brand} •••• ${paymentMethod.last4}`}
              </span>
            ) : (
              'this payment method'
            )}? 
            {user?.subscription?.isActive && (
              <span className="block mt-2">
                If you have an active subscription, you'll need to add a new payment method before your next billing cycle.
              </span>
            )}
          </p>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={onConfirm}
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
  };
  
  // Render Subscription Section (for Payment Tab)
  const renderSubscriptionSection = () => {
    return (
      <div className="subscription-section mb-8">
        <h3 className="text-xl font-bold mb-4">Your Subscription</h3>
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-lg">{user?.subscription?.plan || 'Free Plan'}</h4>
              <p className="text-gray-400 text-sm">
                {user?.subscription?.isActive ? 'Active' : 'Not active'}
              </p>
            </div>
            <button 
              onClick={() => setShowPlanSelectionModal(true)}
              className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white text-sm py-2 px-4 rounded-lg"
            >
              {user?.subscription?.isActive ? 'Change Plan' : 'Upgrade'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render Payment Methods Section (for Payment Tab)
  const renderPaymentMethodsSection = () => {
    // Choose payment methods from state or user object
    const methodsToUse = paymentMethods && paymentMethods.length > 0 
      ? paymentMethods 
      : (user.paymentMethods && user.paymentMethods.length > 0 ? user.paymentMethods : []);
    
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="text-tiktok-pink h-6 w-6 mr-3">
              <path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
            </svg>
            <h2 className="text-xl font-semibold">Payment Methods</h2>
          </div>
          
          {/* Only show this button when there are already payment methods */}
          {methodsToUse.length > 0 && (
            <button 
              onClick={() => setShowAddCardModal(true)}
              className="flex items-center text-sm bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white py-2 px-4 rounded-xl transition-all hover:opacity-90"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add New
            </button>
          )}
        </div>
        
        {methodsToUse.length > 0 ? (
          <div className="space-y-3">
            {methodsToUse.map((method, index) => (
              <PaymentMethodCard
                key={index}
                paymentMethod={method}
                isDefault={user.paymentMethod && user.paymentMethod.id === method.id}
                onDelete={() => handleDeletePaymentMethod(method.id)}
                onMakeDefault={() => handleMakeDefaultPaymentMethod(method)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="mb-4 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-gray-300 mb-4">You haven't added any payment methods yet.</p>
            <button 
              onClick={() => setShowAddCardModal(true)}
              className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white py-2 px-6 rounded-xl hover:opacity-90 transition-opacity"
            >
              Add Payment Method
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // Render Billing History Section (for Payment Tab)
  const renderBillingHistorySection = () => {
    // Helper function to format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };
    
    return (
      <div>
        {loadingPaymentHistory ? (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-8 h-8 border-t-2 border-b-2 border-tiktok-pink rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-300">Loading payment history...</p>
          </div>
        ) : paymentHistory.length > 0 ? (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 text-left">
                  <tr>
                    <th className="py-3 px-4 text-gray-400 font-medium text-sm">Date</th>
                    <th className="py-3 px-4 text-gray-400 font-medium text-sm">Amount</th>
                    <th className="py-3 px-4 text-gray-400 font-medium text-sm">Plan</th>
                    <th className="py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
                    <th className="py-3 px-4 text-gray-400 font-medium text-sm">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((payment, idx) => (
                    <tr key={payment.id || idx} className="border-t border-gray-700">
                      <td className="py-3 px-4">{formatDate(payment.date)}</td>
                      <td className="py-3 px-4">${payment.amount}</td>
                      <td className="py-3 px-4">{payment.plan || 'Unknown Plan'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'succeeded' 
                            ? 'bg-green-500/20 text-green-500' 
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {payment.status === 'succeeded' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => generateReceipt(payment)}
                          className="text-tiktok-blue hover:text-tiktok-pink transition-colors text-sm flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="mb-4 flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-300">No payment history available</p>
            <button 
              onClick={fetchPaymentHistory} 
              className="mt-4 flex items-center justify-center mx-auto bg-gray-800 text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <IoReloadOutline className="mr-2" />
              Refresh
            </button>
          </div>
        )}
      </div>
    );
  };

  // Handle adding a new card
  const handleAddCard = async (cardData) => {
    try {
      setProcessingCard(true);
      
      // Card data now contains a Stripe payment method from Stripe Elements
      if (!cardData.stripePaymentMethod) {
        throw new Error('No payment method received from Stripe');
      }
      
      const paymentMethod = cardData.stripePaymentMethod;
      
      // Now save the payment method reference to our database
      const paymentMethodData = {
        id: paymentMethod.id, // This is the key - using Stripe's PM ID
        type: 'card',
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month.toString(),
        expYear: paymentMethod.card.exp_year.toString().slice(-2), // Save last 2 digits
        nameOnCard: cardData.nameOnCard
      };
      
      // Save to our database
      const response = await savePaymentMethod(paymentMethodData, user.token);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save payment method');
      }
      
      // Use the returned payment method
      const newPaymentMethod = response.paymentMethod;
      
      // Update the user with the new payment method
      const updatedUser = { ...user };
      
      // Initialize payment methods array if needed
      if (!updatedUser.paymentMethods) {
        updatedUser.paymentMethods = [];
      }
      
      // Add the new payment method
      updatedUser.paymentMethods.push(newPaymentMethod);
      
      // Set as default if it's the first one
      if (!updatedUser.paymentMethod) {
        updatedUser.paymentMethod = newPaymentMethod;
      }
      
      // Update the paymentMethods state
      setPaymentMethods(prevMethods => [...(prevMethods || []), newPaymentMethod]);
      
      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setShowAddCardModal(false);
      setSuccess('Payment method added successfully!');
      return true;
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Failed to add payment method. Please try again.');
      return false;
    } finally {
      setProcessingCard(false);
    }
  };
  
  // Helper function to determine card brand from number
  const determineCardBrand = (cardNumber) => {
    // Remove all non-digit characters
    const cleanNumber = cardNumber.replace(/\D/g, '');
    
    // Basic regex patterns for card identification
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^(6011|65|64[4-9])/,
      diners: /^(36|38|30[0-5])/,
      jcb: /^35/
    };
    
    // Check which pattern matches
    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanNumber)) {
        return brand;
      }
    }
    
    // Default to generic if no match
    return 'unknown';
  };
  
  // Handle adding PayPal
  const handleAddPayPal = async (paypalData) => {
    try {
      setProcessingCard(true);
      
      // We need to create a dummy Stripe payment method for PayPal
      // In production, you would integrate with PayPal's API directly
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }
      
      // For this example, we'll create a simple card payment method in test mode
      // In production, you should create a proper PayPal payment method or source
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: '4242424242424242', // Test card number
          exp_month: 12,
          exp_year: 2030,
          cvc: '123'
        },
        billing_details: {
          name: user.name,
          email: paypalData.email || user.email
        }
      });
      
      if (error) {
        throw new Error('Failed to create PayPal payment method: ' + error.message);
      }
      
      // Format the payment method data for storage
      const paymentMethodData = {
        id: paymentMethod.id, // Use Stripe's payment method ID
        type: 'paypal',
        brand: 'paypal',
        last4: 'PYPL',
        email: paypalData.email || user.email
      };
      
      // Save to the database first
      const response = await savePaymentMethod(paymentMethodData, user.token);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save PayPal account');
      }
      
      // Use the returned payment method with server-generated ID
      const newPaymentMethod = response.paymentMethod;
      
      // Update the user with the new payment method
      const updatedUser = { ...user };
      
      // Initialize payment methods array if needed
      if (!updatedUser.paymentMethods) {
        updatedUser.paymentMethods = [];
      }
      
      // Add the new payment method
      updatedUser.paymentMethods.push(newPaymentMethod);
      
      // Set as default if it's the first one
      if (!updatedUser.paymentMethod) {
        updatedUser.paymentMethod = newPaymentMethod;
      }
      
      // Update the paymentMethods state
      setPaymentMethods(prevMethods => [...(prevMethods || []), newPaymentMethod]);
      
      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setShowAddCardModal(false);
      setSuccess('PayPal account added successfully!');
      return true;
    } catch (error) {
      console.error('PayPal error:', error);
      setError(error.message || 'Failed to add PayPal account. Please try again.');
      return false;
    } finally {
      setProcessingCard(false);
    }
  };
  
  // Handle making a payment method the default
  const handleMakeDefaultPaymentMethod = async (method) => {
    try {
      setProcessingCard(true);
      setError('');
      setSuccess('');

      // Get the method ID (either as string or from object)
      const methodId = typeof method === 'string' ? method : method.id;

      // Call API to set the default payment method
      await setDefaultPaymentMethod(methodId, user.token);
      
      // Find the full method object if we only have the ID
      const methodObj = typeof method === 'string' 
        ? paymentMethods.find(m => m.id === methodId) 
        : method;
      
      if (!methodObj) {
        throw new Error('Payment method not found');
      }
      
      // Update the user object
      const updatedUser = { ...user };
      updatedUser.paymentMethod = methodObj;
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update the paymentMethods state to mark this method as default
      // This ensures the UI updates immediately
      if (paymentMethods && paymentMethods.length > 0) {
        // Create a new array with the same payment methods
        // This will trigger a re-render
        setPaymentMethods([...paymentMethods]);
      }
      
      // Update state
      setUser(updatedUser);
      setSuccess('Payment method set as default');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      setError('Failed to set default payment method');
    } finally {
      setProcessingCard(false);
    }
  };
  
  // Confirm deletion of a payment method
  const confirmDeletePaymentMethod = async () => {
    setProcessingCard(true);
    try {
      // Make sure we have a selected payment method
      if (!selectedPaymentMethod) {
        throw new Error('No payment method selected for deletion');
      }
      
      // Get the method ID (either as string or from object)
      const methodId = typeof selectedPaymentMethod === 'string' 
        ? selectedPaymentMethod 
        : selectedPaymentMethod.id;
      
      // Call API to delete the payment method
      await deletePaymentMethod(methodId, user.token);
      
      // Update the user object
      const updatedUser = { ...user };
      
      // If deleting the default payment method
      if (updatedUser.paymentMethod && updatedUser.paymentMethod.id === methodId) {
        delete updatedUser.paymentMethod;
      }
      
      // Remove from the payment methods array
      if (updatedUser.paymentMethods && Array.isArray(updatedUser.paymentMethods)) {
        updatedUser.paymentMethods = updatedUser.paymentMethods.filter(
          method => method.id !== methodId
        );
        
        // If we deleted the default and have other payment methods, set the first one as default
        if (!updatedUser.paymentMethod && updatedUser.paymentMethods.length > 0) {
          updatedUser.paymentMethod = updatedUser.paymentMethods[0];
          
          // Also update the default in the database
          try {
            await setDefaultPaymentMethod(updatedUser.paymentMethod.id, user.token);
          } catch (error) {
            console.error('Error setting new default payment method:', error);
            // Continue anyway
          }
        }
      }
      
      // Update the paymentMethods state directly to reflect the change in UI immediately
      setPaymentMethods(prevMethods => {
        if (!prevMethods) return [];
        return prevMethods.filter(method => method.id !== methodId);
      });
      
      // Update localStorage and state
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Close modal and show success
      setShowDeletePaymentModal(false);
      setSuccess('Payment method removed successfully');
    } catch (error) {
      console.error('Error removing payment method:', error);
      setError('Failed to remove payment method');
    } finally {
      setShowDeletePaymentModal(false);
      setProcessingCard(false);
    }
  };
  
  // Handle plan selection
  const handlePlanSelection = (planId, billingCycle) => {
    setSelectedPlanId(planId);
    setSelectedBillingCycle(billingCycle);
    
    // In a real application, this would make an API call to update the subscription
    // For now, just simulate success
    setSuccess('Plan changed successfully!');
    setShowPlanSelectionModal(false);
  };
  
  // Handle cancel subscription confirmation
  const confirmCancelSubscription = () => {
    // In a real application, this would make an API call to cancel the subscription
    // For now, just simulate success
    
    // Update the user object
    const updatedUser = { ...user };
    if (updatedUser.subscription) {
      updatedUser.subscription.cancelAtPeriodEnd = true;
    }
    
    // Update localStorage and state
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    
    setShowCancelConfirmation(false);
    setSuccess('Your subscription has been canceled. You will have access until the end of your current billing period.');
  };
  
  // Generate receipt function
  const generateReceipt = (payment) => {
    // First, try to use the receipt URL if available
    if (payment.receiptUrl) {
      // Open receipt URL in a new tab
      window.open(payment.receiptUrl, '_blank');
      return;
    }
    
    // If no receipt URL is available, create a basic receipt download
    try {
      // Format date
      const paymentDate = payment.date ? new Date(payment.date).toLocaleDateString() : 'N/A';
      
      // Create receipt content
      const receiptContent = `
        Receipt
        -------
        Payment ID: ${payment.id || 'Unknown'}
        Date: ${paymentDate}
        Amount: $${payment.amount?.toFixed(2) || '0.00'}
        Plan: ${payment.plan || 'Unknown Plan'}
        Status: ${payment.status === 'succeeded' ? 'Paid' : 'Pending'}
        ${payment.receiptNumber ? `Receipt Number: ${payment.receiptNumber}` : ''}
      `.trim().replace(/^ +/gm, ''); // Remove leading spaces from each line
      
      // Create a blob with the receipt content
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${payment.id || Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    setSuccess('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error generating receipt:', error);
      setError('Failed to generate receipt');
    }
  };
  
  // Payment Method Card Component
  const PaymentMethodCard = ({ paymentMethod, isDefault, onDelete, onMakeDefault }) => {
    // Helper function to get the card brand logo/text
    const getCardBrandLogo = (brand) => {
      switch (brand?.toLowerCase()) {
        case 'visa':
          return <span className="text-white font-bold text-xs">VISA</span>;
        case 'mastercard':
          return <span className="text-white font-bold text-xs">MC</span>;
        case 'amex':
          return <span className="text-white font-bold text-xs">AMEX</span>;
        case 'discover':
          return <span className="text-white font-bold text-xs">DISC</span>;
        case 'paypal':
          return <span className="text-blue-400 font-bold text-xs">PayPal</span>;
        case 'apple_pay':
        case 'applepay':
          return <span className="text-white font-bold text-xs">Apple Pay</span>;
        case 'google_pay':
        case 'googlepay':
          return <span className="text-white font-bold text-xs">Google Pay</span>;
        default:
          return <span className="text-white font-bold text-xs">CARD</span>;
      }
    };
    
    return (
      <div className="bg-gray-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <div className={`h-12 w-16 rounded-lg flex items-center justify-center ${
            paymentMethod.brand === 'visa' ? 'bg-blue-900' :
            paymentMethod.brand === 'mastercard' ? 'bg-red-900' :
            paymentMethod.brand === 'amex' ? 'bg-blue-800' :
            paymentMethod.brand === 'discover' ? 'bg-orange-900' :
            paymentMethod.brand === 'paypal' ? 'bg-blue-800' :
            'bg-gray-700'
          }`}>
            {getCardBrandLogo(paymentMethod.brand)}
          </div>
          <div className="ml-4">
            <div className="flex items-center">
              {paymentMethod.type === 'card' ? (
                <p className="font-medium">•••• •••• •••• {paymentMethod.last4}</p>
              ) : paymentMethod.type === 'paypal' ? (
                <p className="font-medium">{paymentMethod.email || 'PayPal Account'}</p>
              ) : ['apple_pay', 'google_pay', 'express_checkout'].includes(paymentMethod.type) ? (
                <p className="font-medium">{paymentMethod.brand === 'apple_pay' ? 'Apple Pay' : 'Google Pay'}</p>
              ) : (
                <p className="font-medium">•••• •••• •••• {paymentMethod.last4}</p>
              )}
              {isDefault && (
                <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-500 text-xs rounded-full">
                  Default
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {paymentMethod.type === 'card' && paymentMethod.expMonth && paymentMethod.expYear 
                ? `Expires ${paymentMethod.expMonth}/${paymentMethod.expYear}`
                : paymentMethod.type === 'paypal' 
                ? 'PayPal'
                : paymentMethod.type === 'apple_pay' 
                ? 'Apple Pay'
                : paymentMethod.type === 'google_pay'
                ? 'Google Pay'
                : paymentMethod.type === 'express_checkout'
                ? 'Express Checkout'
                : 'Card'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-0">
          {!isDefault && (
            <button 
              onClick={onMakeDefault}
              className="py-2 px-3 rounded-lg text-white bg-gray-700 hover:bg-gray-600 transition-colors text-sm"
            >
              Set Default
            </button>
          )}
          <button 
            onClick={onDelete} 
            className="py-2 px-3 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-red-400 hover:text-red-300 transition-colors text-sm"
          >
            Remove
          </button>
        </div>
      </div>
    );
  };
  
  // Add Card Modal Component
  const AddCardModal = ({ show, onClose, onAddCard, onAddPayPal, processingCard }) => {
    const [activeTab, setActiveTab] = useState('card');
    const [cardData, setCardData] = useState({
      nameOnCard: ''
    });
    const [paypalEmail, setPaypalEmail] = useState('');
    const [cardError, setCardError] = useState('');
    const stripe = useStripe();
    const elements = useElements();
    
    if (!show) return null;
    
    const handleCardFormSubmit = async (e) => {
      e.preventDefault();
      setCardError('');
      
      if (!stripe || !elements) {
        setCardError('Stripe has not loaded yet. Please try again.');
        return;
      }
      
      // Validate name on card
      if (!cardData.nameOnCard.trim()) {
        setCardError('Please enter the name on the card');
        return;
      }
      
      try {
        // Get card element
        const cardElement = elements.getElement(CardElement);
        
        if (!cardElement) {
          setCardError('Card element not found');
          return;
        }
        
        // Create payment method using Stripe Elements
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: cardData.nameOnCard,
          }
        });
        
        if (error) {
          setCardError(error.message);
          return;
        }
        
        // Call parent's onAddCard with the payment method info
        onAddCard({
          stripePaymentMethod: paymentMethod,
          nameOnCard: cardData.nameOnCard
        });
        
      } catch (error) {
        setCardError(error.message || 'An error occurred while processing your card');
      }
    };
    
    const handlePaypalSubmit = (e) => {
      e.preventDefault();
      onAddPayPal({email: paypalEmail});
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
        <div className="bg-tiktok-dark rounded-xl p-8 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Add Payment Method</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={processingCard}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Payment Method Type Tabs */}
          <div className="flex mb-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('card')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'card' 
                  ? 'text-tiktok-pink border-b-2 border-tiktok-pink' 
                  : 'text-gray-400 hover:text-white'
                }`}
              disabled={processingCard}
            >
              Credit / Debit Card
            </button>
            <button
              onClick={() => setActiveTab('paypal')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'paypal' 
                  ? 'text-tiktok-pink border-b-2 border-tiktok-pink' 
                  : 'text-gray-400 hover:text-white'
                }`}
              disabled={processingCard}
            >
              PayPal
            </button>
          </div>
          
          {/* Credit Card Form */}
          {activeTab === 'card' && (
            <form onSubmit={handleCardFormSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Card Details
                  </label>
                  <div className="bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus-within:border-tiktok-pink focus-within:ring-2 focus-within:ring-tiktok-pink">
                    <CardElement options={{
                      style: {
                        base: {
                          color: '#ffffff',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '16px',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                        invalid: {
                          color: '#fa755a',
                          iconColor: '#fa755a',
                        },
                      },
                    }} />
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    value={cardData.nameOnCard}
                    onChange={(e) => setCardData({...cardData, nameOnCard: e.target.value})}
                    className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                    required
                    placeholder="John Doe"
                    disabled={processingCard}
                  />
                </div>
                
                {cardError && (
                  <div className="text-red-500 text-sm">{cardError}</div>
                )}
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center w-full"
                  disabled={processingCard || !stripe}
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
            </form>
          )}
          
          {/* PayPal Form */}
          {activeTab === 'paypal' && (
            <form onSubmit={handlePaypalSubmit}>
              <div className="space-y-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-4 flex items-center">
                  <div>
                    <h3 className="text-white font-medium mb-1">Link Your PayPal Account</h3>
                    <p className="text-gray-400 text-sm">
                      Simply enter your PayPal email address to link your account
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    PayPal Email Address
                  </label>
                  <input
                    type="email"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="bg-gray-800 text-white rounded-xl w-full p-3 border border-gray-700 focus:border-tiktok-pink focus:ring-2 focus:ring-tiktok-pink focus:outline-none placeholder-gray-500"
                    required
                    placeholder="your-email@example.com"
                    disabled={processingCard}
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-blue-700 text-white font-medium py-3 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center w-full"
                  disabled={processingCard}
                >
                  {processingCard ? (
                    <>
                      <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Connect PayPal Account'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };
  
  // Plan Selection Modal Component
  const PlanSelectionModal = ({ show, onClose, onSelectPlan, selectedPlanId, selectedBillingCycle, onChangeBillingCycle }) => {
    if (!show) return null;
    
    // Sample plans - in a real app, these would come from an API
    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: 19,
        features: ['10 videos per month', 'Basic editing tools', 'Email support']
      },
      {
        id: 'growth',
        name: 'Growth',
        price: 49,
        features: ['50 videos per month', 'Advanced editing tools', 'Priority support']
      },
      {
        id: 'scale',
        name: 'Scale',
        price: 99,
        features: ['Unlimited videos', 'Premium effects', '24/7 dedicated support']
      }
    ];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4">
        <div className="bg-tiktok-dark rounded-xl p-8 max-w-4xl w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Choose a Plan</h2>
                <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
                >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
                </button>
          </div>
          
          {/* Billing cycle toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-900 p-1 rounded-xl inline-flex">
                <button 
                onClick={() => onChangeBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedBillingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
                </button>
              <button 
                onClick={() => onChangeBillingCycle('yearly')}
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
              const isCurrentPlan = selectedPlanId === plan.id;
              const yearlyDiscount = selectedBillingCycle === 'yearly' ? 0.8 : 1; // 20% discount
              const price = plan.price * yearlyDiscount;
              
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
                  
                  <p className="text-3xl font-bold mb-4">
                    ${selectedBillingCycle === 'yearly' ? (price).toFixed(2) : price}
                    <span className="text-sm text-gray-400 font-normal">/month</span>
                  </p>
                  
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
                    onClick={() => onSelectPlan(plan.id, selectedBillingCycle)}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white hover:opacity-90'
                    }`}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                        </button>
            </div>
              );
            })}
            </div>
        </div>
      </div>
    );
  };
  
  // Cancel Subscription Modal Component
  const CancelSubscriptionModal = ({ show, onClose, onConfirm, onReasonChange, cancelReason }) => {
    if (!show) return null;
    
    return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4 py-6">
      <div className="bg-tiktok-dark rounded-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Cancel Subscription</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
        </div>
        
        <p className="text-gray-300 mb-6">
            Are you sure you want to cancel your subscription? You'll still have access until the end of your current billing period.
          </p>
          
          <div className="mb-6">
            <label className="block text-white text-sm font-medium mb-2">
              Why are you cancelling? (Optional)
            </label>
            <select
              value={cancelReason}
              onChange={(e) => onReasonChange(e.target.value)}
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
              onClick={onClose}
              className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
              Keep Subscription
          </button>
          
          <button
              onClick={onConfirm}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );
  };
  
  // Modal for cancel confirmation
  const CancelConfirmationModal = () => {
    const handleCancelSubscription = async () => {
      setProcessingCard(true);
      
      try {
        // Call API to cancel subscription
        const response = await subscriptionService.cancelSubscription({
          reason: cancelReason || 'No reason provided'
        });
        
        if (response.success) {
          // Update the user object
          const updatedUser = { ...user };
          if (updatedUser.subscription) {
            updatedUser.subscription.cancelAtPeriodEnd = true;
            updatedUser.subscription.isCanceled = true;
            updatedUser.subscription.willCancelAt = response.cancelDate;
          }
          
          // Update localStorage and state
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          
          setSuccess('Your subscription has been canceled. You will have access until the end of your current billing period.');
          setShowCancelConfirmation(false);
          
          // Refresh subscription usage if available
          if (typeof setSubscriptionUsage === 'function') {
            try {
              if (typeof loadingUsage === 'function') {
                loadingUsage(true);
              }
              
              const usageResponse = await subscriptionService.getSubscriptionUsage();
              if (usageResponse && usageResponse.success) {
                if (typeof setSubscriptionUsage === 'function') {
                  // Update subscription usage state with cancellation flags
                  setSubscriptionUsage({
                    ...usageResponse.usage,
                    cancelAtPeriodEnd: true,
                    isCanceled: true
                  });
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
        } else {
          setError(response.error || 'Failed to cancel subscription. Please try again.');
        }
      } catch (error) {
        setError('Failed to cancel subscription. Please try again.');
        console.error('Cancel subscription error:', error);
      } finally {
        setProcessingCard(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 px-4 py-6">
        <div className="bg-tiktok-dark rounded-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Cancel Subscription</h2>
            <button 
              onClick={() => setShowCancelConfirmation(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="text-gray-300 mb-6">
            Are you sure you want to cancel your subscription? You'll still have access until the end of your current billing period.
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
              onClick={() => setShowCancelConfirmation(false)}
              className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Keep Subscription
            </button>
            
            <button
              onClick={handleCancelSubscription}
              disabled={processingCard}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              {processingCard ? (
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
  };
  
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