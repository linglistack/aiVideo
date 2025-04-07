import React, { useState } from 'react';
import axios from 'axios';
import { 
  IoMailOutline, 
  IoCallOutline, 
  IoHelpCircleOutline, 
  IoChatbubbleOutline, 
  IoSendOutline,
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoPersonOutline
} from 'react-icons/io5';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Support = () => {
  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Send data to backend API
      const response = await axios.post(`${API_URL}/contact/submit`, formData);
      
      if (response.data.success) {
        setSubmitted(true);
        // Reset form
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        
        // Reset submitted state after 5 seconds
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        setError(response.data.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting contact form:', err);
      setError(err.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqItems = [
    {
      id: 1,
      question: "How many story videos can I create per month?",
      answer: "The number of story videos you can create depends on your subscription plan. The Starter plan includes 10 story videos per month, the Growth plan provides 50 videos per month, and the Scale plan offers 150 videos per month."
    },
    {
      id: 2,
      question: "How do I upgrade my subscription?",
      answer: "To upgrade your subscription, go to the Subscription section in your account settings. You can view available plans and select the one that best fits your needs. Your new plan will be activated immediately after payment."
    },
    {
      id: 3,
      question: "Can I customize the text overlays on my scene images?",
      answer: "Yes, you can add and edit emoji text overlays on each scene image. This allows you to emphasize key points or add dialogue to your story visuals. You can also choose to have scenes without text overlay if you prefer."
    },
    {
      id: 4,
      question: "What if I don't like a scene image that was generated?",
      answer: "If you don't like a particular scene image, you can simply click the refresh button to generate a new image for that scene while keeping the rest of your story intact. You can regenerate scenes as many times as needed until you're satisfied."
    },
    {
      id: 5,
      question: "How does the AI expand my story input?",
      answer: "Our AI can take even a simple word or phrase and expand it into a complete narrative. You can input anything from a single concept to a detailed story, and the AI will generate appropriate scene images based on your input, creating a cohesive visual story."
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
                  <h3 className="text-lg font-semibold text-white mb-2">Message Received!</h3>
                  <p className="text-gray-400">Thank you for reaching out. Our team will review your message and get back to you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2" htmlFor="name">
                        <div className="flex items-center">
                          <IoPersonOutline className="mr-2" />
                          Your Name
                        </div>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                        required
                        placeholder="Enter your name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2" htmlFor="email">
                        <div className="flex items-center">
                          <IoMailOutline className="mr-2" />
                          Your Email
                        </div>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                        required
                        placeholder="Enter your email address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2" htmlFor="subject">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                        required
                        placeholder="What is your message about?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2" htmlFor="message">
                        Message
                      </label>
                      <textarea
                        id="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows="6"
                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                        required
                        placeholder="How can we help you?"
                      ></textarea>
                    </div>
                    
                    {error && (
                      <div className="bg-red-900/30 border border-red-900 text-red-200 p-3 rounded-lg text-sm">
                        {error}
                      </div>
                    )}
                    
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