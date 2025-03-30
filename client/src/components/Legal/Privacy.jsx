import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IoArrowBack, IoShieldCheckmark } from 'react-icons/io5';
import { getCurrentUser } from '../../services/authService';

const Privacy = () => {
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
        
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
            Privacy Policy
          </h1>
          <div className="flex items-center text-tiktok-blue">
            <IoShieldCheckmark className="text-2xl mr-2" /> 
            <span className="text-sm">Your privacy is our priority</span>
          </div>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">1. Introduction</h2>
          <p className="text-gray-300 mb-4">
            At TikTok Generator, we respect your privacy and are committed to protecting your personal data.
            This Privacy Policy explains how we collect, use, and safeguard your information when you use our website
            and services.
          </p>
          <p className="text-gray-300 mb-4">
            By accessing or using our services, you consent to the collection and use of your information
            as described in this Privacy Policy.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">2. Information We Collect</h2>
          <p className="text-gray-300 mb-4">
            We collect several types of information from and about users of our website, including:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
            <li>
              <span className="font-semibold text-white">Personal Information:</span> Name, email address, 
              and billing information when you create an account or subscribe to our services.
            </li>
            <li>
              <span className="font-semibold text-white">Usage Data:</span> Information about how you interact 
              with our website, such as pages visited, time spent on pages, and other browsing information.
            </li>
            <li>
              <span className="font-semibold text-white">Content Data:</span> Information and content you 
              upload or create using our services, including images, texts, and videos.
            </li>
          </ul>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">3. How We Use Your Information</h2>
          <p className="text-gray-300 mb-4">
            We use the information we collect for various purposes, including to:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
            <li>Provide, maintain, and improve our services</li>
            <li>Process your subscriptions and payments</li>
            <li>Send you updates, notifications, and support messages</li>
            <li>Understand how users interact with our platform to enhance user experience</li>
            <li>Detect, prevent, and address technical issues or fraudulent activities</li>
          </ul>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">4. Data Security</h2>
          <p className="text-gray-300 mb-4">
            We implement appropriate technical and organizational measures to protect your personal data against
            unauthorized access, alteration, disclosure, or destruction.
          </p>
          <p className="text-gray-300 mb-4">
            While we strive to use commercially acceptable means to protect your personal data, 
            no method of transmission over the internet or electronic storage is 100% secure, 
            and we cannot guarantee absolute security.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">5. Third-Party Services</h2>
          <p className="text-gray-300 mb-4">
            Our service may contain links to third-party websites or services that are not owned or controlled
            by us. We have no control over and assume no responsibility for the content, privacy policies,
            or practices of any third-party websites or services.
          </p>
          <p className="text-gray-300 mb-4">
            We may use third-party service providers to facilitate our service, process payments, or analyze how
            our service is used. These third parties have access to your personal data only to perform these
            tasks on our behalf and are obligated not to disclose or use it for any other purpose.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">6. Your Data Rights</h2>
          <p className="text-gray-300 mb-4">
            Depending on your location, you may have certain rights regarding your personal data, including:
          </p>
          <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
            <li>The right to access the personal data we hold about you</li>
            <li>The right to request correction of inaccurate data</li>
            <li>The right to request deletion of your data</li>
            <li>The right to restrict or object to our processing of your data</li>
            <li>The right to data portability</li>
          </ul>
          <p className="text-gray-300 mb-4">
            To exercise any of these rights, please contact us using the information provided at the end of this Policy.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">7. Cookies Policy</h2>
          <p className="text-gray-300 mb-4">
            We use cookies and similar tracking technologies to track activity on our website and store certain information.
            Cookies are files with a small amount of data that may include an anonymous unique identifier.
          </p>
          <p className="text-gray-300 mb-4">
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However,
            if you do not accept cookies, you may not be able to use some portions of our service.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">8. Changes to This Privacy Policy</h2>
          <p className="text-gray-300 mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting
            the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
          <p className="text-gray-300 mb-4">
            You are advised to review this Privacy Policy periodically for any changes. Changes to this
            Privacy Policy are effective when they are posted on this page.
          </p>
        </div>
        
        <div className="bg-tiktok-dark rounded-2xl p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white">9. Contact Us</h2>
          <p className="text-gray-300 mb-4">
            If you have any questions about this Privacy Policy, please <Link to="/contact" className="text-tiktok-pink hover:underline">contact us</Link>.
          </p>
        </div>
        
        <div className="text-center text-gray-400 mt-8">
          <p>Last Updated: May 2023</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy; 