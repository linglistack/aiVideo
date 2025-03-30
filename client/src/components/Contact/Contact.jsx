import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  IoArrowBack, 
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoChatbubbleOutline,
  IoSendOutline,
  IoLogoTwitter,
  IoLogoInstagram,
  IoLogoTiktok,
  IoLogoLinkedin
} from 'react-icons/io5';
import { getCurrentUser } from '../../services/authService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const user = getCurrentUser();
  const isLoggedIn = !!user;
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  return (
    <div className={`min-h-screen bg-black ${isLoggedIn ? 'pt-4' : 'pt-10'} pb-16`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!isLoggedIn && (
          <div className="flex items-center mb-8">
            <Link to="/" className="text-gray-400 hover:text-tiktok-pink transition-colors flex items-center">
              <IoArrowBack className="mr-2" /> Back to Home
            </Link>
          </div>
        )}
        
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
          Contact Us
        </h1>
        
        <p className="text-gray-300 max-w-3xl mb-12">
          We'd love to hear from you! Whether you have a question about our platform, pricing, or anything else,
          our team is ready to answer all your questions.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-tiktok-dark rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-6 text-white">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink p-3 rounded-full mr-4 flex-shrink-0">
                    <IoMailOutline className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Email</h3>
                    <a href="mailto:hydreamsllc@gmail.com" className="text-gray-400 hover:text-tiktok-pink transition-colors">
                      hydreamsllc@gmail.com
                    </a>
                    <p className="text-xs text-gray-500 mt-1">We typically respond within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink p-3 rounded-full mr-4 flex-shrink-0">
                    <IoCallOutline className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Phone</h3>
                    <a href="tel:+19173617727" className="text-gray-400 hover:text-tiktok-pink transition-colors">
                      (917) 361-7727
                    </a>
                    <p className="text-xs text-gray-500 mt-1">Available Mon-Fri, 9am to 5pm EST</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink p-3 rounded-full mr-4 flex-shrink-0">
                    <IoLocationOutline className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Office</h3>
                    <p className="text-gray-400">New York, NY</p>
                    <p className="text-xs text-gray-500 mt-1">By appointment only</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink p-3 rounded-full mr-4 flex-shrink-0">
                    <IoChatbubbleOutline className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Live Chat</h3>
                    <p className="text-gray-400">Coming soon!</p>
                    <p className="text-xs text-gray-500 mt-1">We're working on implementing live chat support</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-10 pt-8 border-t border-gray-800">
                <h3 className="font-medium text-white mb-4">Follow Us</h3>
                <div className="flex space-x-4">
                  <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <IoLogoTiktok className="text-white text-xl" />
                  </a>
                  <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <IoLogoTwitter className="text-white text-xl" />
                  </a>
                  <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <IoLogoInstagram className="text-white text-xl" />
                  </a>
                  <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <IoLogoLinkedin className="text-white text-xl" />
                  </a>
                </div>
              </div>
            </div>
            
            <div className="bg-tiktok-dark rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-6 text-white">Frequently Asked Questions</h2>
              <p className="text-gray-400 mb-4">Find quick answers to common questions</p>
              <Link to="/help" className="text-tiktok-pink hover:underline inline-flex items-center">
                Visit our Help Center
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-tiktok-dark rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-6 text-white">Send a Message</h2>
              
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
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-gray-400 text-sm mb-2" htmlFor="name">
                      Your Name
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
                  
                  <div className="md:col-span-1">
                    <label className="block text-gray-400 text-sm mb-2" htmlFor="email">
                      Your Email
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
                  
                  <div className="md:col-span-2">
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
                  
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-sm mb-2" htmlFor="message">
                      Message
                    </label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows="8"
                      className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                      required
                      placeholder="How can we help you?"
                    ></textarea>
                  </div>
                  
                  {error && (
                    <div className="md:col-span-2 bg-red-900/30 border border-red-900 text-red-200 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
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
        </div>
      </div>
    </div>
  );
};

export default Contact; 