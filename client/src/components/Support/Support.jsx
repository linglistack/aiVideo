import React, { useState } from 'react';
import { 
  IoMailOutline, 
  IoCallOutline, 
  IoHelpCircleOutline, 
  IoChatbubbleOutline, 
  IoSendOutline,
  IoChevronDownOutline,
  IoChevronUpOutline
} from 'react-icons/io5';

const Support = () => {
  const [activeTab, setActiveTab] = useState('contact');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setMessage('');
      setSubject('');
      
      // Reset submitted state after 5 seconds
      setTimeout(() => setSubmitted(false), 5000);
    }, 1000);
  };

  const faqItems = [
    {
      id: 1,
      question: "How many videos can I create per month?",
      answer: "The number of videos you can create depends on your subscription plan. The Starter plan includes 10 videos per month, the Growth plan provides 50 videos per month, and the Scale plan offers 150 videos per month."
    },
    {
      id: 2,
      question: "How do I upgrade my subscription?",
      answer: "To upgrade your subscription, go to the Billing section in your account settings. You can view available plans and select the one that best fits your needs. Your new plan will be activated immediately after payment."
    },
    {
      id: 3,
      question: "Can I download the videos I create?",
      answer: "Yes, all videos you create are available for download. After your video is generated, you'll find a download button on the video details page. You can download in MP4 format for use across different platforms."
    },
    {
      id: 4,
      question: "How do I customize my AI presenter?",
      answer: "You can customize your AI presenter by uploading a photo during the video creation process. Our AI will animate the photo and create a natural-looking presenter who will deliver your script with your chosen tone and style."
    },
    {
      id: 5,
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. All payments are processed securely through Stripe."
    }
  ];

  return (
    <div className="min-h-screen bg-black pt-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
            Help & Support
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Need assistance with your account or videos? We're here to help you create amazing content.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-tiktok-dark rounded-full p-1">
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                activeTab === 'contact'
                  ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Contact Us
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-2 rounded-full font-medium text-sm transition-colors duration-200 ${
                activeTab === 'faq'
                  ? 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              FAQ
            </button>
          </div>
        </div>

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Contact Info */}
            <div className="bg-tiktok-dark rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-6">Get in Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-black p-3 rounded-full mr-4">
                    <IoMailOutline className="text-tiktok-pink text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Email</h3>
                    <p className="text-gray-400 mt-1">lingligantz@gmail.com</p>
                    <p className="text-xs text-gray-500 mt-1">We typically respond within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-black p-3 rounded-full mr-4">
                    <IoCallOutline className="text-tiktok-pink text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Phone</h3>
                    <p className="text-gray-400 mt-1">(917) 361-7727</p>
                    <p className="text-xs text-gray-500 mt-1">Available Mon-Fri, 9am to 5pm EST</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-black p-3 rounded-full mr-4">
                    <IoChatbubbleOutline className="text-tiktok-pink text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Live Chat</h3>
                    <p className="text-gray-400 mt-1">Coming soon!</p>
                    <p className="text-xs text-gray-500 mt-1">We're working on implementing live chat support</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="bg-tiktok-dark rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-6">Send a Message</h2>
              
              {submitted ? (
                <div className="bg-gradient-to-r from-tiktok-blue/20 to-tiktok-pink/20 p-6 rounded-xl text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Message Sent!</h3>
                  <p className="text-gray-400">We've received your message and will get back to you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2" htmlFor="subject">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2" htmlFor="message">
                        Message
                      </label>
                      <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows="6"
                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                        required
                      ></textarea>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                      {submitting ? (
                        <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-2"></div>
                      ) : (
                        <IoSendOutline className="mr-2" />
                      )}
                      {submitting ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="bg-tiktok-dark rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <IoHelpCircleOutline className="text-tiktok-pink mr-2 text-2xl" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {faqItems.map((faq) => (
                <div 
                  key={faq.id} 
                  className="border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full px-6 py-4 text-left flex items-center justify-between focus:outline-none"
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  >
                    <span className="font-medium text-white">{faq.question}</span>
                    {expandedFaq === faq.id ? (
                      <IoChevronUpOutline className="text-tiktok-pink" />
                    ) : (
                      <IoChevronDownOutline className="text-gray-400" />
                    )}
                  </button>
                  
                  {expandedFaq === faq.id && (
                    <div className="px-6 py-4 bg-black/30 border-t border-gray-800">
                      <p className="text-gray-400">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-gray-400 mb-4">Didn't find what you're looking for?</p>
              <button
                onClick={() => setActiveTab('contact')}
                className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-medium py-2 px-6 rounded-full hover:opacity-90 transition-opacity"
              >
                Contact Support
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support; 