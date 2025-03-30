import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  IoArrowBack, 
  IoHelpCircleOutline, 
  IoSearchOutline,
  IoChevronDown,
  IoChevronUp,
  IoVideocamOutline,
  IoWalletOutline,
  IoPersonOutline,
  IoSettingsOutline
} from 'react-icons/io5';
import { getCurrentUser } from '../../services/authService';

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItem, setExpandedItem] = useState(null);
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const user = getCurrentUser();
  const isLoggedIn = !!user;
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const toggleItem = (itemId) => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(itemId);
    }
  };
  
  const helpCategories = [
    {
      id: 'getting-started',
      name: 'Getting Started',
      icon: <IoHelpCircleOutline className="text-xl" />
    },
    {
      id: 'video-creation',
      name: 'Video Creation',
      icon: <IoVideocamOutline className="text-xl" />
    },
    {
      id: 'billing',
      name: 'Billing & Subscriptions',
      icon: <IoWalletOutline className="text-xl" />
    },
    {
      id: 'account',
      name: 'Account Management',
      icon: <IoPersonOutline className="text-xl" />
    },
    {
      id: 'settings',
      name: 'Settings & Preferences',
      icon: <IoSettingsOutline className="text-xl" />
    }
  ];
  
  const faqItems = {
    'getting-started': [
      {
        id: 'gs-1',
        question: 'How do I create my first video?',
        answer: 'To create your first video, log in to your account and click on the "Create Video" button in your dashboard. Follow the step-by-step guide to select an avatar, enter your script, and generate your video. Once the video is created, you can download it or share it directly on social media.'
      },
      {
        id: 'gs-2',
        question: 'What subscription plan should I choose?',
        answer: 'Choose your subscription plan based on how many videos you need to create monthly. The Starter plan offers 10 videos per month, the Growth plan provides 50 videos, and the Scale plan allows for 150 videos. All plans include full access to our UGC avatars and viral hook generation features. You can upgrade or downgrade your plan at any time from your account settings.'
      },
      {
        id: 'gs-3',
        question: 'How long does it take to generate a video?',
        answer: 'Video generation typically takes 2-5 minutes, depending on the length and complexity of your script. Once submitted, you can monitor the progress in your dashboard. You\'ll receive a notification when your video is ready for viewing and download.'
      },
      {
        id: 'gs-4',
        question: 'Can I try the platform before subscribing?',
        answer: 'Yes! We offer a free trial that includes 3 video credits. This allows you to test the platform\'s capabilities before committing to a subscription plan. No credit card is required to start the free trial.'
      }
    ],
    'video-creation': [
      {
        id: 'vc-1',
        question: 'What types of videos can I create?',
        answer: 'Our platform allows you to create a variety of TikTok-style videos including product demonstrations, tutorials, testimonials, educational content, and entertainment. You can choose from over 200+ AI avatars or upload your own photos to create custom presenters.'
      },
      {
        id: 'vc-2',
        question: 'How do I customize my AI avatars?',
        answer: 'To customize your AI avatar, navigate to the "Create Video" section and select "Custom Avatar". You can upload photos of yourself or your brand ambassador, and our AI will animate the photo to create a natural-looking presenter who will deliver your script with your chosen tone and style.'
      },
      {
        id: 'vc-3',
        question: 'Can I edit my videos after creation?',
        answer: 'Currently, our platform focuses on the initial video generation. For editing, we recommend downloading your video and using your preferred video editing software. However, you can easily regenerate a new video with modified script or avatar if you\'re not satisfied with the result.'
      },
      {
        id: 'vc-4',
        question: 'What resolution and format are the videos?',
        answer: 'Our videos are generated in 1080x1920 resolution (9:16 aspect ratio), which is optimal for TikTok, Instagram Reels, and YouTube Shorts. Videos are delivered in MP4 format, making them compatible with all major social media platforms and video players.'
      }
    ],
    'billing': [
      {
        id: 'bill-1',
        question: 'How do I change my subscription plan?',
        answer: 'To change your subscription plan, go to Account > Subscription > Manage Plan. You can upgrade immediately or downgrade effective at the end of your current billing cycle. If you upgrade, you\'ll be charged the prorated difference between your current plan and the new plan.'
      },
      {
        id: 'bill-2',
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. All payments are processed securely through Stripe, ensuring your payment information remains safe and protected.'
      },
      {
        id: 'bill-3',
        question: 'How do refunds work?',
        answer: 'If you\'re not satisfied with our service, you can request a refund within 7 days of your initial subscription purchase. For refund requests, please contact our support team through the Contact page or via email. Please note that refunds are not available for partial subscription periods or for individual videos generated.'
      },
      {
        id: 'bill-4',
        question: 'Will my subscription automatically renew?',
        answer: 'Yes, all subscriptions automatically renew at the end of each billing cycle (monthly or annually) until canceled. You can cancel your subscription at any time from your Account > Subscription page, and you\'ll continue to have access until the end of your current billing period.'
      }
    ],
    'account': [
      {
        id: 'acc-1',
        question: 'How do I reset my password?',
        answer: 'To reset your password, click "Forgot Password" on the login screen. Enter your email address, and we\'ll send you a password reset link. Follow the link to create a new password. For security reasons, password reset links expire after 24 hours.'
      },
      {
        id: 'acc-2',
        question: 'Can I have multiple users on one account?',
        answer: 'Currently, each account supports a single user. For team usage, we recommend our Scale plan which provides more video credits. We\'re working on adding team collaboration features in the future, allowing multiple team members to access and manage content under a single organization account.'
      },
      {
        id: 'acc-3',
        question: 'How do I delete my account?',
        answer: 'To delete your account, go to Account > Settings > Delete Account. Please note that account deletion is permanent and will remove all your data, including generated videos, from our system. We recommend downloading any videos you wish to keep before deleting your account.'
      }
    ],
    'settings': [
      {
        id: 'set-1',
        question: 'How do I change notification settings?',
        answer: 'To adjust your notification preferences, go to Account > Settings > Notifications. You can toggle email notifications for video completion, subscription updates, and marketing communications. You can also set up desktop notifications for real-time alerts about your video generation status.'
      },
      {
        id: 'set-2',
        question: 'Can I integrate with other platforms?',
        answer: 'We currently offer direct sharing options for TikTok, Instagram, and YouTube. For more advanced integrations with other marketing platforms, we provide API access on our Scale plan. Check our documentation for details on API usage and available endpoints.'
      },
      {
        id: 'set-3',
        question: 'How do I set default preferences for video creation?',
        answer: 'Go to Account > Settings > Video Defaults to set your preferred avatar, voice style, and other video creation parameters. These settings will be pre-selected whenever you create a new video, saving you time in the creation process.'
      }
    ]
  };
  
  const filteredFAQs = searchQuery.trim() 
    ? Object.values(faqItems).flat().filter(item => 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqItems[activeCategory];

  return (
    <div className={`min-h-screen bg-black ${isLoggedIn ? 'pt-4' : 'pt-10'} pb-16`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {!isLoggedIn && (
          <div className="flex items-center mb-8">
            <Link to="/" className="text-gray-400 hover:text-tiktok-pink transition-colors flex items-center">
              <IoArrowBack className="mr-2" /> Back to Home
            </Link>
          </div>
        )}
        
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
          Help Center
        </h1>
        
        {/* Search Bar */}
        <div className="relative mb-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-tiktok-dark border-2 border-gray-700 focus:border-tiktok-pink rounded-full py-3 px-5 pl-12 text-white focus:outline-none"
            />
            <IoSearchOutline className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-tiktok-dark rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6 text-white">Categories</h2>
              <nav className="space-y-2">
                {helpCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                      activeCategory === category.id && !searchQuery
                        ? 'bg-gradient-to-r from-tiktok-blue/20 to-tiktok-pink/20 text-tiktok-pink'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-3">{category.icon}</span>
                    <span>{category.name}</span>
                  </button>
                ))}
              </nav>
              
              <div className="mt-8 pt-6 border-t border-gray-700">
                <Link to="/support" className="w-full flex items-center px-4 py-3 rounded-lg bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white text-center justify-center hover:opacity-90 transition-opacity">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
          
          {/* FAQ Content */}
          <div className="md:col-span-3">
            {searchQuery.trim() ? (
              <>
                <h2 className="text-xl font-bold mb-6 text-white">
                  Search Results for "{searchQuery}"
                </h2>
                
                {filteredFAQs.length === 0 ? (
                  <div className="bg-tiktok-dark rounded-2xl p-8 text-center">
                    <IoHelpCircleOutline className="text-6xl mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-bold mb-2 text-white">No results found</h3>
                    <p className="text-gray-400">
                      Try different keywords or browse the categories for help
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredFAQs.map(item => (
                      <div key={item.id} className="bg-tiktok-dark rounded-2xl overflow-hidden">
                        <button
                          className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                          onClick={() => toggleItem(item.id)}
                        >
                          <span className="font-medium text-white">{item.question}</span>
                          {expandedItem === item.id ? (
                            <IoChevronUp className="text-tiktok-pink" />
                          ) : (
                            <IoChevronDown className="text-gray-400" />
                          )}
                        </button>
                        
                        {expandedItem === item.id && (
                          <div className="px-6 py-4 bg-black/30 border-t border-gray-800">
                            <p className="text-gray-300">{item.answer}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-6 text-white">
                  {helpCategories.find(c => c.id === activeCategory)?.name || 'Help Topics'}
                </h2>
                
                <div className="space-y-4">
                  {filteredFAQs.map(item => (
                    <div key={item.id} className="bg-tiktok-dark rounded-2xl overflow-hidden">
                      <button
                        className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                        onClick={() => toggleItem(item.id)}
                      >
                        <span className="font-medium text-white">{item.question}</span>
                        {expandedItem === item.id ? (
                          <IoChevronUp className="text-tiktok-pink" />
                        ) : (
                          <IoChevronDown className="text-gray-400" />
                        )}
                      </button>
                      
                      {expandedItem === item.id && (
                        <div className="px-6 py-4 bg-black/30 border-t border-gray-800">
                          <p className="text-gray-300">{item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <div className="mt-10 bg-gradient-to-r from-tiktok-blue/10 to-tiktok-pink/10 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-bold mb-4 text-white">Need more help?</h3>
              <p className="text-gray-300 mb-6">Our support team is ready to assist you with any questions or issues</p>
              <Link to="/support" className="inline-block px-6 py-3 bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium rounded-full hover:opacity-90 transition-opacity">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help; 