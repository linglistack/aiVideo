import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

// TikTok logo SVG
const TikTokLogo = () => (
    <svg height="42" width="118" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 118 42" className="fill-current">
      <path d="M9.87537 16.842V15.7233C9.49211 15.6721 9.10246 15.6401 8.70003 15.6401C3.90288 15.6338 0 19.5399 0 24.3475C0 27.2947 1.46917 29.9031 3.71764 31.4822C2.26763 29.9287 1.37974 27.8381 1.37974 25.5494C1.37974 20.8121 5.17403 16.9507 9.87537 16.842Z" fill="#25F4EE"></path>
      <path d="M10.0862 29.5259C12.2261 29.5259 13.9763 27.819 14.053 25.6965L14.0594 6.72822H17.5215C17.4512 6.33824 17.4129 5.93548 17.4129 5.52632H12.686L12.6796 24.4946C12.603 26.6171 10.8527 28.324 8.71286 28.324C8.04854 28.324 7.42255 28.1578 6.86682 27.8637C7.58224 28.8674 8.75758 29.5259 10.0862 29.5259Z" fill="#25F4EE"></path>
      <path d="M23.9923 13.166V12.1112C22.6701 12.1112 21.4436 11.7212 20.4088 11.0435C21.3286 12.0984 22.5742 12.8656 23.9923 13.166Z" fill="#25F4EE"></path>
      <path d="M20.4088 11.0435C19.3995 9.88639 18.7927 8.37762 18.7927 6.72821H17.528C17.8537 8.53106 18.9269 10.0782 20.4088 11.0435Z" fill="#FE2C55"></path>
      <path d="M8.70642 20.3646C6.51544 20.3646 4.73328 22.1483 4.73328 24.3411C4.73328 25.8691 5.602 27.1988 6.86676 27.8637C6.39408 27.2116 6.11302 26.4125 6.11302 25.543C6.11302 23.3502 7.89518 21.5665 10.0862 21.5665C10.495 21.5665 10.891 21.6368 11.2615 21.7519V16.9188C10.8782 16.8676 10.4886 16.8356 10.0862 16.8356C10.0159 16.8356 9.95202 16.842 9.88175 16.842V21.7519C9.50488 21.6368 9.11523 21.5665 8.70642 21.5665Z" fill="#FE2C55"></path>
      <path d="M23.9921 13.166V16.842C21.5392 16.842 19.2652 16.0557 17.4127 14.7259V24.3475C17.4127 29.1487 13.5099 33.0548 8.70631 33.0548C6.85388 33.0548 5.12921 32.4547 3.71753 31.4822C5.30806 33.1117 7.57569 34.1266 10.0861 34.1266C14.8832 34.1266 18.786 30.2205 18.786 25.4193V15.7975C20.6386 17.1273 22.9125 17.9136 25.3654 17.9136V13.3762C24.8918 13.3762 24.4314 13.3032 23.9921 13.166Z" fill="#FE2C55"></path>
      <path d="M17.4127 24.3475V14.7259C19.2652 16.0557 21.5392 16.842 23.9921 16.842V13.3762C22.574 13.0654 21.3284 12.2982 20.4086 11.0435C18.9266 10.0782 17.8599 8.53106 17.5213 6.72821H14.0592L14.0528 25.6964C13.9762 27.8189 12.2259 29.5259 10.0861 29.5259C8.75742 29.5259 7.58847 28.8674 6.86028 27.8701C5.59551 27.1988 4.72679 25.8755 4.72679 24.3475C4.72679 22.1547 6.50895 20.371 8.69993 20.371C9.10874 20.371 9.50478 20.4413 9.87527 20.5564V15.6465C5.17393 15.7629 1.37964 19.6242 1.37964 24.3475C1.37964 26.6363 2.26753 28.7268 3.71753 30.2804C5.12921 31.2529 6.85389 31.853 8.70632 31.853C13.5099 31.853 17.4127 27.9469 17.4127 24.3475Z" fill="black"></path>
      <path d="M30.0477 13.1787H44.8225L43.4683 17.411H39.6357V33.0548H34.8577V17.411L30.0541 17.4173L30.0477 13.1787Z" fill="black"></path>
      <path d="M69.0317 13.1787H84.1514L82.7972 17.411H78.6261V33.0548H73.8417V17.411L69.0381 17.4173L69.0317 13.1787Z" fill="black"></path>
      <path d="M45.7295 22.015H50.4628V33.0548H45.755L45.7295 22.015Z" fill="black"></path>
      <path d="M52.347 13.1277H57.0802V22.015H52.347V13.1277Z" fill="black"></path>
      <path d="M52.347 22.015H57.0802V33.0548H52.347V22.015Z" fill="black"></path>
      <path d="M59.4308 13.1277H64.1641V33.0548H59.4308V13.1277Z" fill="black"></path>
      <path d="M67.3218 13.1277H72.0551V18.7707H67.3218V13.1277Z" fill="black"></path>
      <path d="M85.6839 13.1277H90.4172V33.0548H85.6839V13.1277Z" fill="black"></path>
      <path d="M93.1936 13.1277H97.9269V33.0548H93.1936V13.1277Z" fill="black"></path>
      <path d="M45.7295 13.1277H50.4628V18.7707H45.7295V13.1277Z" fill="black"></path>
    </svg>
  );

const LandingPage = () => {
  const videoRefs = useRef([]);
  
  // Mock video data
// ... existing code ...

// Update demoVideos with reliable sources
const demoVideos = [
  {
    id: 1,
    url: "https://www.w3schools.com/html/mov_bbb.mp4",
    caption: "Check out this amazing product! #viral #trend",
    user: "creativecreator",
    avatar: "https://via.placeholder.com/150"
  },
  {
    id: 2,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    caption: "This is why everyone is switching to our service! 🚀",
    user: "techinfluencer",
    avatar: "https://via.placeholder.com/150"
  },
  {
    id: 3,
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    caption: "Family moments made better with our products",
    user: "familylifestyle",
    avatar: "https://via.placeholder.com/150"
  }
];

// ... rest of your component ...

  // Intersection Observer to play videos when in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.play();
          } else {
            entry.target.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    videoRefs.current.forEach((video) => {
      if (video) {
        observer.observe(video);
      }
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) {
          observer.unobserve(video);
        }
      });
    };
  }, []);

  return (
    <div className="pt-16 bg-black min-h-screen">
      {/* Hero Section */}
      <div className="py-12 bg-gradient-to-r from-tiktok-blue to-tiktok-pink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
              Automate TikToks that drive
              <br />
              <span className="block mt-2">traffic to your website</span>
            </h1>
            <p className="mt-4 text-xl text-white opacity-90">
              It's like a gen z marketing team, but way cheaper
            </p>
            <div className="mt-8 flex justify-center space-x-4">
              <Link to="/register" className="tiktok-btn-primary">
                Start Now
              </Link>
              <Link to="/product" className="bg-white text-tiktok-dark font-semibold px-6 py-3 rounded-full hover:bg-opacity-90 transition duration-200">
                Demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Video Feed Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-white text-center mb-10">
          See what our AI can create for you
        </h2>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory py-4 -mx-4 scrollbar-hide gap-4">
          {demoVideos.map((video, index) => (
            <div key={video.id} className="snap-start flex-shrink-0 w-full sm:w-72 md:w-80 h-[600px] px-4">
              <div className="bg-tiktok-dark rounded-2xl overflow-hidden h-full relative shadow-xl">
                <video
                  ref={(el) => (videoRefs.current[index] = el)}
                  className="absolute inset-0 w-full h-full object-cover"
                  src={video.url}
                  poster={video.thumbnailUrl}
                  controls
                  onError={(e) => {
                    console.error("Video loading error:", e);
                    // Optionally set a fallback or show an error message
                    e.target.src = "https://www.w3schools.com/html/mov_bbb.mp4"; // Fallback to a reliable source
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                
                {/* Video controls */}
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <div className="flex items-center">
                    <img 
                      src={video.avatar} 
                      alt={video.user} 
                      className="w-10 h-10 rounded-full border-2 border-white"
                    />
                    <div className="ml-2">
                      <p className="text-white font-semibold">@{video.user}</p>
                      <p className="text-white text-sm">{video.caption}</p>
                    </div>
                  </div>
                </div>
                
                {/* Right side actions */}
                <div className="absolute right-4 bottom-20 flex flex-col items-center space-y-4">
                  <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-16 bg-tiktok-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-tiktok-dark mb-12">
            Choose your plan
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden transform transition duration-500 hover:scale-105">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-center text-tiktok-dark">Starter</h3>
                <div className="mt-4 text-center">
                  <span className="text-5xl font-extrabold text-tiktok-dark">$19</span>
                  <span className="text-xl text-gray-500">/month</span>
                </div>
                <p className="mt-1 text-center text-gray-500">10 videos per month</p>
              </div>
              
              <div className="border-t border-gray-200 px-8 py-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>10 videos</strong> per month</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>All 200+ UGC avatars</strong></span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Generate <strong>unlimited</strong> viral hooks</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>Create your own AI avatars</strong> (25 images and 5 videos)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-red-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="ml-3 text-gray-400">Publish to TikTok</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-red-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="ml-3 text-gray-400">Schedule/automate videos</span>
                  </li>
                </ul>
              </div>
              
              <div className="px-8 pb-8">
                <Link to="/register" className="w-full flex justify-center py-3 px-4 border border-tiktok-dark rounded-full shadow-sm text-sm font-medium text-tiktok-dark bg-white hover:bg-gray-50">
                  Buy Now
                </Link>
              </div>
            </div>

            {/* Growth Plan */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden transform transition duration-500 hover:scale-105 border-2 border-tiktok-pink relative">
              <div className="absolute top-0 inset-x-0">
                <div className="bg-tiktok-pink text-white text-center py-1 text-sm font-medium">
                  Most Popular
                </div>
              </div>
              
              <div className="p-8 pt-12">
                <h3 className="text-2xl font-bold text-center text-tiktok-dark">Growth</h3>
                <div className="mt-4 text-center">
                  <span className="text-5xl font-extrabold text-tiktok-dark">$49</span>
                  <span className="text-xl text-gray-500">/month</span>
                </div>
                <p className="mt-1 text-center text-gray-500">50 videos per month</p>
              </div>
              
              <div className="border-t border-gray-200 px-8 py-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>50 videos</strong> per month</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>All 200+ UGC avatars</strong></span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Generate <strong>unlimited</strong> viral hooks</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>Create your own AI avatars</strong> (100 images and 25 videos)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Publish to TikTok</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Schedule/automate videos</span>
                  </li>
                </ul>
              </div>
              
              <div className="px-8 pb-8">
                <Link to="/register" className="w-full flex justify-center py-3 px-4 bg-tiktok-pink border border-transparent rounded-full shadow-sm text-sm font-medium text-white hover:bg-opacity-90">
                  Buy Now
                </Link>
              </div>
            </div>

            {/* Scale Plan */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden transform transition duration-500 hover:scale-105">
              <div className="p-8">
                <h3 className="text-2xl font-bold text-center text-tiktok-dark">Scale</h3>
                <div className="mt-4 text-center">
                  <span className="text-5xl font-extrabold text-tiktok-dark">$95</span>
                  <span className="text-xl text-gray-500">/month</span>
                </div>
                <p className="mt-1 text-center text-gray-500">150 videos per month</p>
              </div>
              
              <div className="border-t border-gray-200 px-8 py-6">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>150 videos</strong> per month</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>All 200+ UGC avatars</strong></span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Generate <strong>unlimited</strong> viral hooks</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700"><strong>Create your own AI avatars</strong> (200 images and 50 videos)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Publish to TikTok</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="ml-3 text-gray-700">Schedule/automate videos</span>
                  </li>
                </ul>
              </div>
              
              <div className="px-8 pb-8">
                <Link to="/register" className="w-full flex justify-center py-3 px-4 border border-tiktok-dark rounded-full shadow-sm text-sm font-medium text-tiktok-dark bg-white hover:bg-gray-50">
                  Buy Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-tiktok-dark mb-2">Features</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">Everything you need to create viral TikTok content</p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-tiktok-gray rounded-2xl p-8 text-center transition-transform hover:scale-105 duration-300">
              <div className="h-16 w-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-tiktok-dark mb-3">Create "hook + demo" videos</h3>
              <p className="text-gray-600">Create & publish UGC videos promoting your product demo</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-tiktok-gray rounded-2xl p-8 text-center transition-transform hover:scale-105 duration-300">
              <div className="h-16 w-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-tiktok-dark mb-3">UGC Avatar Generator</h3>
              <p className="text-gray-600">Create custom AI avatars for the UGC "hook + demo" video format</p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-tiktok-gray rounded-2xl p-8 text-center transition-transform hover:scale-105 duration-300">
              <div className="h-16 w-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-tiktok-dark mb-3">Automated Campaigns</h3>
              <p className="text-gray-600">Automatically create & auto-publish UGC videos to your TikTok account</p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-tiktok-gray rounded-2xl p-8 text-center transition-transform hover:scale-105 duration-300">
              <div className="h-16 w-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-tiktok-dark mb-3">Hook Generator</h3>
              <p className="text-gray-600">Auto-magically generate and save viral hooks for your videos</p>
            </div>
            
            {/* Feature 5 */}
            <div className="bg-tiktok-gray rounded-2xl p-8 text-center transition-transform hover:scale-105 duration-300">
              <div className="h-16 w-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-tiktok-dark mb-3">Create greenscreen meme videos</h3>
              <p className="text-gray-600">Create relatable meme videos about your product / business</p>
            </div>
            
            {/* Feature 6 */}
            <div className="bg-tiktok-gray rounded-2xl p-8 text-center transition-transform hover:scale-105 duration-300">
              <div className="h-16 w-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-tiktok-dark mb-3">Create slideshow videos</h3>
              <p className="text-gray-600">Create & publish image slideshow videos to TikTok</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="py-16 bg-tiktok-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to go viral?</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Join thousands of businesses using our platform to create TikTok videos that convert
          </p>
          <Link to="/register" className="tiktok-btn-primary inline-block">
            Get Started Now
          </Link>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><Link to="/features" className="text-gray-400 hover:text-white">Features</Link></li>
                <li><Link to="/pricing" className="text-gray-400 hover:text-white">Pricing</Link></li>
                <li><Link to="/demo" className="text-gray-400 hover:text-white">Demo</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-400 hover:text-white">About</Link></li>
                <li><Link to="/blog" className="text-gray-400 hover:text-white">Blog</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="/terms" className="text-gray-400 hover:text-white">Terms</Link></li>
                <li><Link to="/privacy" className="text-gray-400 hover:text-white">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© 2025 StoryScene AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;