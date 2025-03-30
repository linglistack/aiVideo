import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { getCurrentUser } from '../../services/authService';

const Terms = () => {
  const user = getCurrentUser();
  const isLoggedIn = !!user;
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <div className={`min-h-screen bg-black ${isLoggedIn ? 'pt-4' : 'pt-10'} pb-16`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {!isLoggedIn && (
          <div className="flex items-center mb-8">
            <Link to="/" className="text-gray-400 hover:text-tiktok-pink transition-colors flex items-center">
              <IoArrowBack className="mr-2" /> Back to Home
            </Link>
          </div>
        )}
        
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
          Terms of Service
        </h1>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">1. Introduction</h2>
          <p className="text-gray-300 mb-4">
            Welcome to TikTok Generator! These Terms of Service govern your use of our website and services. 
            By accessing or using our services, you agree to be bound by these Terms.
          </p>
          <p className="text-gray-300 mb-4">
            Our platform allows you to create AI-powered TikTok videos. These Terms outline your rights and
            responsibilities when using our services.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">2. Account Registration</h2>
          <p className="text-gray-300 mb-4">
            To use our services, you must create an account. You are responsible for maintaining the
            confidentiality of your account information and for all activities that occur under your account.
          </p>
          <p className="text-gray-300 mb-4">
            You must provide accurate, current, and complete information during the registration process and
            keep your account information updated.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">3. Subscription Plans and Payments</h2>
          <p className="text-gray-300 mb-4">
            We offer various subscription plans for our services. The details of each plan, including pricing
            and features, are available on our Pricing page.
          </p>
          <p className="text-gray-300 mb-4">
            Payments are processed securely through our payment processor. By subscribing to our services,
            you agree to pay the applicable fees according to your chosen subscription plan.
          </p>
          <p className="text-gray-300 mb-4">
            Subscriptions automatically renew at the end of each billing period unless cancelled.
            You may cancel your subscription at any time through your account settings.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">4. Content Guidelines</h2>
          <p className="text-gray-300 mb-4">
            You are responsible for all content created using our platform. You must not create or share
            content that is illegal, harmful, threatening, abusive, defamatory, or otherwise objectionable.
          </p>
          <p className="text-gray-300 mb-4">
            We reserve the right to remove any content that violates these Terms or is otherwise
            objectionable at our sole discretion.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">5. Intellectual Property Rights</h2>
          <p className="text-gray-300 mb-4">
            You retain ownership of the content you create using our platform. However, by using our services,
            you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, and display your
            content solely for the purpose of providing and improving our services.
          </p>
          <p className="text-gray-300 mb-4">
            Our platform, including its design, features, and functionality, is the intellectual property
            of TikTok Generator and is protected by copyright, trademark, and other intellectual property laws.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">6. Limitation of Liability</h2>
          <p className="text-gray-300 mb-4">
            Our services are provided "as is" without any warranty, express or implied. We do not guarantee
            that our services will be uninterrupted, secure, or error-free.
          </p>
          <p className="text-gray-300 mb-4">
            In no event will we be liable for any indirect, incidental, special, consequential, or punitive
            damages arising out of or in connection with your use of our services.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">7. Changes to These Terms</h2>
          <p className="text-gray-300 mb-4">
            We may update these Terms from time to time. We will notify you of any significant changes
            by posting the new Terms on this page and updating the "Last Updated" date.
          </p>
          <p className="text-gray-300 mb-4">
            Your continued use of our services after any changes to these Terms constitutes your acceptance
            of the new Terms.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">8. Contact Us</h2>
          <p className="text-gray-300 mb-4">
            If you have any questions about these Terms, please <Link to="/contact" className="text-tiktok-pink hover:underline">contact us</Link>.
          </p>
        </div>
        
        <div className="text-center text-gray-400 mt-8">
          <p>Last Updated: May 2023</p>
        </div>
      </div>
    </div>
  );
};

export default Terms; 