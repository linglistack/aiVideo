import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TikTokLogo from '../common/TikTokLogo';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const LandingPage = () => {
  const videosRef = useRef({});
  const [isPlaying, setIsPlaying] = useState({});
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  
  // Flag to track if user has interacted with the page
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  
  // Demo videos with reliable sources
  const demoVideos = [
    {
      id: 0,
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
      caption: "Check out this amazing product! #viral #trend",
      user: "creativecreator",
      avatar: "https://via.placeholder.com/150"
    },
    {
      id: 1,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      caption: "This is why everyone is switching to our service! 🚀",
      user: "techinfluencer",
      avatar: "https://via.placeholder.com/150"
    },
    {
      id: 2,
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      caption: "Family moments made better with our products",
      user: "familylifestyle",
      avatar: "https://via.placeholder.com/150"
    },
    // {
    //   id: 3,
    //   url: "https://www.w3schools.com/html/mov_bbb.mp4",
    //   caption: "Check out this amazing product! #viral #trend",
    //   user: "creativecreator",
    //   avatar: "https://via.placeholder.com/150"
    // },
  ];

  const [muteStates, setMuteStates] = useState({});

  // Initialize isPlaying state
  useEffect(() => {
    const initialPlayState = {};
    demoVideos.forEach(video => {
      initialPlayState[video.id] = false;
    });
    setIsPlaying(initialPlayState);
  }, []);

  // Initialize all videos to be muted initially
  // useEffect(() => {
  //   const initialMuteState = {};
  //   demoVideos.forEach(video => {
  //     initialMuteState[video.id] = true; // All videos start muted
  //   });
  //   setMuteStates(initialMuteState);
  // }, [demoVideos]);

  // Function to toggle play/pause with safety checks
  const togglePlay = (videoId) => {
    // Set user interaction flag
    setUserHasInteracted(true);
    
    const videoElement = videosRef.current[videoId];
    if (!videoElement) return;
    
    if (videoElement.paused) {
      // Make sure video is muted
      videoElement.muted = true;
      
      // Try to play with error handling
      videoElement.play()
        .then(() => {
          setIsPlaying(prev => ({ ...prev, [videoId]: true }));
        })
        .catch(error => {
          console.error("Play failed:", error);
          setIsPlaying(prev => ({ ...prev, [videoId]: false }));
        });
    } else {
      videoElement.pause();
      setIsPlaying(prev => ({ ...prev, [videoId]: false }));
    }
  };

  // Listen for the first user interaction with the document
  useEffect(() => {
    const handleUserInteraction = () => {
      setUserHasInteracted(true);
    };
    
    // These events signify user interaction
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Function to scroll to specific video
  const scrollToVideo = (index) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const videoElements = container.querySelectorAll('.snap-center');
    
    if (videoElements[index]) {
      // Instead of using scrollIntoView which can be inconsistent,
      // directly set the scrollLeft property
      const scrollTarget = videoElements[index];
      const containerWidth = container.offsetWidth;
      const scrollTargetLeft = scrollTarget.offsetLeft;
      const scrollTargetWidth = scrollTarget.offsetWidth;
      
      // Calculate position to center the target in the container
      const newScrollPosition = scrollTargetLeft - (containerWidth / 2) + (scrollTargetWidth / 2);
      
      // Smoothly scroll to the calculated position
      container.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
      
      setCurrentVideoIndex(index);
    }
  };

  // Update current video index on scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const videoElements = Array.from(container.querySelectorAll('.snap-center'));
      if (videoElements.length === 0) return;
      
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      
      let closestIndex = 0;
      let closestDistance = Infinity;
      
      videoElements.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + (rect.width / 2);
        const distance = Math.abs(containerCenter - itemCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      if (currentVideoIndex !== closestIndex) {
        setCurrentVideoIndex(closestIndex);
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentVideoIndex]);

  // Add an effect to auto-play the current video when it changes
  useEffect(() => {
    const currentVideo = videosRef.current[demoVideos[currentVideoIndex]?.id];
    if (currentVideo) {
      currentVideo.muted = !userHasInteracted;
      currentVideo.play().catch(err => console.error("Error auto-playing video:", err));
    }
  }, [currentVideoIndex, demoVideos, userHasInteracted]);

  // Make sure all videos play muted on mount and when visibility changes
  useEffect(() => {
    // Start playing all visible videos
    const playVisibleVideos = () => {
      const visibleIndices = [0, 1, 2].map(i => i + currentVideoIndex).filter(i => i < demoVideos.length);
      
      visibleIndices.forEach(index => {
        const videoEl = videosRef.current[demoVideos[index].id];
        if (videoEl) {
          videoEl.play().catch(err => console.error("Error playing video:", err));
        }
      });
    };
    
    // Play videos when the carousel position changes
    playVisibleVideos();
    
    // Also set up an intersection observer for better performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const video = entry.target;
            if (video.paused) {
              video.play().catch(err => console.error("Error playing video:", err));
            }
          } else {
            const video = entry.target;
            if (!video.paused) {
              video.pause();
            }
          }
        });
      },
      { threshold: 0.5 }
    );
    
    // Observe all video elements
    Object.values(videosRef.current).forEach(video => {
      if (video) observer.observe(video);
    });
    
    return () => {
      Object.values(videosRef.current).forEach(video => {
        if (video) observer.unobserve(video);
      });
    };
  }, [currentVideoIndex, demoVideos]);

  // Pricing plans
  const pricingPlans = [
    {
      id: 1,
      name: "Starter",
      price: 19,
      videosPerMonth: 10,
      features: [
        "10 videos per month",
        "All 200+ UGC avatars",
        "Generate unlimited viral hooks",
        "Create your own AI avatars (25 images and 5 videos)",
      ],
      disabledFeatures: [
        "Publish to TikTok",
        "Schedule/automate videos"
      ],
      popular: false,
      callToAction: "Buy Now"
    },
    {
      id: 2,
      name: "Growth",
      price: 49,
      videosPerMonth: 50,
      features: [
        "50 videos per month",
        "All 200+ UGC avatars",
        "Generate unlimited viral hooks",
        "Create your own AI avatars (100 images and 25 videos)",
        "Publish to TikTok",
        "Schedule/automate videos"
      ],
      disabledFeatures: [],
      popular: true,
      callToAction: "Buy Now"
    },
    {
      id: 3,
      name: "Scale",
      price: 95,
      videosPerMonth: 150,
      features: [
        "150 videos per month",
        "All 200+ UGC avatars",
        "Generate unlimited viral hooks",
        "Create your own AI avatars (200 images and 50 videos)",
        "Publish to TikTok",
        "Schedule/automate videos"
      ],
      disabledFeatures: [],
      popular: false,
      callToAction: "Buy Now"
    }
  ];

  // Add these state variables to your component
  const [activeVideoId, setActiveVideoId] = useState(null);

  // Add this effect to make sure videos stay appropriately muted when navigating
  useEffect(() => {
    // When the carousel index changes, make sure videos maintain proper mute state
    Object.entries(videosRef.current).forEach(([id, videoEl]) => {
      if (videoEl) {
        videoEl.muted = activeVideoId !== parseInt(id);
      }
    });
  }, [currentVideoIndex, activeVideoId]);

  return (
    <div className="bg-black min-h-screen text-white">
      {/* Hero Section */}
      <section className="py-16 text-center">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Create Viral TikTok Videos with AI</h2>
          <p className="text-xl text-gray-300 mb-8">Transform your products into engaging TikTok videos with AI avatars that sell</p>
          <Link to="/register" className="bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white font-bold py-3 px-8 rounded-full text-lg hover:opacity-90 transition-all inline-block">
            Start Creating Now
          </Link>
        </div>
      </section>

      {/* Demo Videos Section */}
      <section className="py-16 bg-tiktok-dark">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-bold mb-10 text-center">See What You Can Create</h3>
          
          {/* Multi-video carousel */}
          <div className="relative max-w-5xl mx-auto">
            {/* Left navigation arrow */}
            <button 
              className="absolute left-[-30px] top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full z-10 hidden md:block"
              onClick={() => {
                const newIndex = Math.max(0, currentVideoIndex - 1);
                setCurrentVideoIndex(newIndex);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Videos container */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentVideoIndex * 33.33}%)` }}
              >
                {demoVideos.map((video) => {
                  const isActive = activeVideoId === video.id;
                  
                  return (
                    <div key={video.id} className="w-1/3 flex-shrink-0 px-2">
                      <div className="bg-black border border-gray-800 rounded-xl overflow-hidden shadow-lg h-full mx-auto" style={{ maxWidth: "280px" }}>
                        <div className="relative pb-[177.77%]">
                          {/* Simple video element with muted attribute directly controlled by state */}
                          <video
                            src={video.url}
                            className="absolute inset-0 w-full h-full object-cover"
                            loop
                            muted={!isActive}
                            autoPlay
                            playsInline
                            onError={(e) => {
                              console.error("Video loading error:", e);
                              e.target.src = "https://www.w3schools.com/html/mov_bbb.mp4";
                            }}
                          />
                          
                          {/* Simple sound toggle button */}
                          <div 
                            className="absolute top-3 right-3 bg-black bg-opacity-70 text-white p-2 rounded-full z-20"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isActive) {
                                setActiveVideoId(null);
                              } else {
                                setActiveVideoId(video.id);
                              }
                            }}
                          >
                            {isActive ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                              </svg>
                            )}
                          </div>
                          
                          {/* Video Info Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                            <p className="text-white font-medium mb-2 text-sm">{video.caption}</p>
                            <div className="flex items-center">
                              <div className="w-7 h-7 rounded-full bg-gray-600 flex-shrink-0 mr-2 overflow-hidden flex items-center justify-center text-white">
                                {video.user.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-white text-xs">@{video.user}</span>
                            </div>
                          </div>
                          
                          {/* Social Icons */}
                          <div className="absolute right-2 bottom-16 flex flex-col space-y-2">
                            <button className="bg-black bg-opacity-60 rounded-full p-1.5 text-white hover:text-tiktok-pink">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            </button>
                            <button className="bg-black bg-opacity-60 rounded-full p-1.5 text-white">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Right navigation arrow */}
            <button 
              className="absolute right-[-30px] top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-3 rounded-full z-10 hidden md:block"
              onClick={() => {
                const newIndex = Math.min(demoVideos.length - 3, currentVideoIndex + 1);
                setCurrentVideoIndex(newIndex);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Carousel Navigation Dots */}
            <div className="flex justify-center mt-6 space-x-3">
              {Array.from({length: Math.max(1, Math.ceil((demoVideos.length - 2) / 1))}).map((_, index) => (
                <button 
                  key={index}
                  className={`w-2.5 h-2.5 rounded-full ${currentVideoIndex === index ? 'bg-tiktok-pink' : 'bg-gray-600'}`}
                  onClick={() => setCurrentVideoIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <h3 className="text-2xl font-bold mb-12 text-center">How It Works</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-tiktok-pink bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-tiktok-pink text-2xl font-bold">1</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Upload Your Product</h4>
              <p className="text-gray-300">Simply upload your product image or enter its name and description</p>
            </div>
            
            <div className="text-center">
              <div className="bg-tiktok-blue bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-tiktok-blue text-2xl font-bold">2</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Choose Your Avatar</h4>
              <p className="text-gray-300">Select from dozens of AI avatars and customize your script</p>
            </div>
            
            <div className="text-center">
              <div className="bg-tiktok-pink bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-tiktok-pink text-2xl font-bold">3</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Generate & Share</h4>
              <p className="text-gray-300">Our AI creates your video in minutes, ready to post on TikTok</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section className="py-20 bg-gray-50 text-gray-900">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">Choose your plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white border ${plan.popular ? 'border-blue-500' : 'border-gray-200'} rounded-lg p-6 flex flex-col relative ${plan.popular ? 'shadow-lg' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <h3 className="text-2xl font-bold mb-4 text-center text-gray-900">{plan.name}</h3>
                
                <div className="mb-6 text-center">
                  <span className="text-5xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 ml-1">
                    /month
                  </span>
                </div>
                
                <div className="text-center mb-6 text-gray-700">
                  {plan.videosPerMonth} videos per month
                </div>
                
                <div className="border-t border-gray-200 my-4"></div>
                
                <div className="flex-grow">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-900 inline-block w-6">
                          {index === 2 ? "✨" : index === 1 ? "👤" : index === 0 ? "🎥" : "✓"}
                        </span>
                        <span className="ml-2 text-gray-700">{feature}</span>
                      </li>
                    ))}
                    
                    {plan.disabledFeatures.map((feature, index) => (
                      <li key={`disabled-${index}`} className="flex items-start">
                        <span className="text-gray-400 inline-block w-6">❌</span>
                        <span className="ml-2 text-gray-400">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Link
                  to={`/payment?plan=${plan.id}`}
                  className={`w-full py-3 px-6 rounded-full font-semibold text-center transition-all ${
                    plan.popular 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {plan.callToAction}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-tiktok-blue to-tiktok-pink">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h3 className="text-3xl font-bold mb-6">Ready to Go Viral?</h3>
          <p className="text-xl mb-8">Join thousands of creators and brands using our platform to create engaging TikTok content</p>
          <Link to="/register" className="bg-white text-tiktok-pink font-bold py-3 px-8 rounded-full text-lg hover:bg-gray-100 transition-all inline-block">
            Start Your Free Trial
          </Link>
          <p className="mt-4 text-sm opacity-80">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <TikTokLogo className="h-6 w-6" />
              <span className="font-bold">TikTok Creator</span>
            </div>
            
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Help</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="text-center mt-6 text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} TikTok Creator. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 