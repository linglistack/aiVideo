import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../../services/config';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Helper function to get auth header
const authHeader = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || !user.token) {
    return {
      headers: { 'Content-Type': 'application/json' }
    };
  }
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`
    }
  };
};

const ScriptToScenes = () => {
  const [script, setScript] = useState('');
  const [expandedScript, setExpandedScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [error, setError] = useState('');
  const [sceneImages, setSceneImages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [fullExpandedText, setFullExpandedText] = useState('');
  const [sceneCount, setSceneCount] = useState(5);
  const [showOverlays, setShowOverlays] = useState({});
  const [globalOverlay, setGlobalOverlay] = useState(true);
  const textareaRef = useRef(null);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const videoRef = useRef(null);

  // Character-by-character typing effect
  useEffect(() => {
    if (fullExpandedText && isTyping) {
      const textLength = fullExpandedText.length;
      let currentIndex = 0;
      
      const typingInterval = setInterval(() => {
        if (currentIndex < textLength) {
          setTypedText(fullExpandedText.substring(0, currentIndex + 1));
          currentIndex++;
          
          // Auto-scroll textarea to bottom as new text appears
          if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
          }
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setExpandedScript(fullExpandedText);
        }
      }, 10); // Adjust speed as needed
      
      return () => clearInterval(typingInterval);
    }
  }, [fullExpandedText, isTyping]);

  // Focus the textarea when needed
  useEffect(() => {
    if (isTyping && textareaRef.current) {
      textareaRef.current.focus();
      
      // Initial scroll to bottom to ensure visibility when typing starts
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [isTyping]);

  // Initialize overlay visibility when new scenes are generated
  useEffect(() => {
    if (sceneImages.length > 0) {
      const initialOverlays = {};
      sceneImages.forEach((_, index) => {
        initialOverlays[index] = globalOverlay;
      });
      setShowOverlays(initialOverlays);
    }
  }, [sceneImages, globalOverlay]);

  // Toggle overlay for a specific scene
  const toggleOverlay = (index) => {
    setShowOverlays(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Toggle all overlays at once
  const toggleAllOverlays = () => {
    const newGlobalState = !globalOverlay;
    setGlobalOverlay(newGlobalState);
    
    const updatedOverlays = {};
    Object.keys(showOverlays).forEach(key => {
      updatedOverlays[key] = newGlobalState;
    });
    setShowOverlays(updatedOverlays);
  };

  // Generate expanded script with Gemini
  const handleExpandScript = async () => {
    if (!script.trim()) {
      setError('Please enter some text to expand.');
      return;
    }

    try {
      setIsGeneratingScript(true);
      setError('');
      
      // Ensure textarea is visible when expansion starts
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const response = await axios.post(
        `${config.videos}/expand-script`,
        { script },
        authHeader()
      );

      if (response.data.success) {
        // Store full text and start typing animation
        setFullExpandedText(response.data.expandedScript);
        setTypedText('');
        setIsTyping(true);
      } else {
        setError(response.data.error || 'Failed to expand script');
      }
    } catch (error) {
      console.error('Error expanding script:', error);
      setError(error.response?.data?.error || 'An unexpected error occurred');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Function to download all images
  const downloadAllImages = async () => {
    if (sceneImages.length === 0) return;
    
    try {
      const zip = new JSZip();
      const folder = zip.folder("scene-images");
      
      // Create promises for all image downloads
      const downloadPromises = sceneImages.map(async (scene, index) => {
        try {
          // Check individual overlay status for this specific scene
          const shouldAddOverlay = showOverlays[index];
          
          let imageData;
          // If the image is a data URL
          if (scene.imageUrl.startsWith('data:')) {
            imageData = scene.imageUrl;
          } else {
            // If it's a remote URL, fetch it
            const response = await fetch(scene.imageUrl);
            const blob = await response.blob();
            imageData = await new Promise(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }
          
          // Apply text overlay if needed for this specific scene
          if (shouldAddOverlay) {
            imageData = await renderTextOverlay(imageData, scene.description, index);
          }
          
          // Extract the base64 data correctly based on the image format
          let base64Data;
          if (imageData.startsWith('data:')) {
            // Handle data URLs (extract base64 portion)
            base64Data = imageData.split(',')[1];
          } else {
            // For non-data URLs, just use the raw data
            base64Data = imageData;
          }
          
          // Add to zip with a more user-friendly name based on first few words of description
          const descWords = scene.description.split(' ').slice(0, 4).join('_');
          const fileName = `scene_${index + 1}_${descWords.replace(/[^\w]/g, '')}_${shouldAddOverlay ? 'with_text' : 'no_text'}.png`;
          folder.file(fileName, base64Data, { base64: true });
          
          return true;
        } catch (error) {
          console.error(`Error processing image ${index + 1}:`, error);
          return false;
        }
      });
      
      await Promise.all(downloadPromises);
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "scene-images.zip");
      
    } catch (error) {
      console.error("Error creating zip file:", error);
      setError("Failed to download images. Please try again.");
    }
  };

  // Update the handleGenerateScenes function to use retries
  const handleGenerateScenes = async () => {
    const scriptToUse = expandedScript || script;
    
    if (!scriptToUse.trim()) {
      setError('Please enter or generate a script first.');
      return;
    }

    try {
      setIsGeneratingScenes(true);
      setError('');
      setSceneImages([]);

      const response = await axios.post(
        `${config.videos}/generate-scenes`,
        { 
          script: scriptToUse,
          count: sceneCount
        },
        {
          ...authHeader(),
          timeout: 60000 // 60-second timeout
        }
      );

      if (response.data.success) {
        // Process scenes and handle image retries
        const scenes = response.data.scenes;
        
        // First set the initial scenes to show something to the user
        setSceneImages(scenes);
        
        // Then check if any images need to be retried
        const updatedScenes = [...scenes];
        let hasUpdates = false;
        
        // Check each scene and retry failed images
        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          
          // If image URL is a placeholder or obviously failed, retry
          if (!scene.imageUrl.startsWith('data:') || 
              scene.imageUrl.includes('Image+Generation+Failed')) {
            
            // Show loading state in UI
            updatedScenes[i] = { 
              ...scene, 
              imageUrl: 'https://placehold.co/600x400/black/white?text=Retrying...'
            };
            setSceneImages([...updatedScenes]);
            
            // Retry image generation
            const retriedScene = await retryImageGeneration(scene, i);
            
            // Update the scene with the retried image
            updatedScenes[i] = retriedScene;
            hasUpdates = true;
            
            // Update UI after each successful retry
            setSceneImages([...updatedScenes]);
          }
        }
        
        // Final update with all retried images if needed
        if (hasUpdates) {
          setSceneImages(updatedScenes);
        }
      } else {
        setError(response.data.error || 'Failed to generate scenes');
      }
    } catch (error) {
      console.error('Error generating scenes:', error);
      
      // Improved error handling
      let errorMessage = 'An unexpected error occurred';
      
      // Handle different error scenarios
      if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 504)) {
        errorMessage = 'Server timeout - The request took too long to process. Try again with a shorter script or fewer scenes.';
      } else if (error.response && error.response.data) {
        // Safely extract error message from response
        errorMessage = typeof error.response.data.error === 'string' 
          ? error.response.data.error 
          : 'Server error: ' + (error.response.status || 'Unknown status');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  // Function to retry image generation up to 5 times
  const retryImageGeneration = async (scene, index, maxRetries = 5) => {
    let retries = 0;
    let success = false;
    let result = { ...scene };

    while (!success && retries < maxRetries) {
      try {
        // Create a placeholder with loading message
        if (retries > 0) {
          console.log(`Retry ${retries}/${maxRetries} for scene ${index + 1}...`);
          // Could show retry status in UI if needed
        }

        const response = await axios.post(
          `${config.videos}/regenerate-scene-image`,
          { 
            imagePrompt: scene.imagePrompt
          },
          {
            ...authHeader(),
            timeout: 30000 // 30-second timeout for individual image generation
          }
        );

        if (response.data && response.data.imageUrl) {
          result.imageUrl = response.data.imageUrl;
          success = true;
        } else {
          retries++;
        }
      } catch (error) {
        console.error(`Error on retry ${retries} for scene ${index + 1}:`, error);
        
        // Check for specific error types
        if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 504)) {
          console.warn(`Timeout on retry ${retries} for scene ${index + 1}`);
        }
        
        retries++;
        
        // Add a small delay before retrying to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!success) {
      result.imageUrl = 'https://placehold.co/600x400/black/white?text=Image+Generation+Failed';
    }

    return result;
  };

  // Function to convert SVG to image
  const svgToImage = (svg, width, height) => {
    return new Promise((resolve) => {
      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.src = url;
    });
  };

  // Function to render text overlay on image
  const renderTextOverlay = async (imageUrl, description, index) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Add text with better sizing proportional to image
        const fontSize = Math.max(16, Math.floor(width / 28));
        
        // Create semi-transparent text with subtle shadow for readability
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = `${fontSize}px Arial`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 7;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Center text horizontally and position toward middle-lower part of image
        const maxWidth = width * 0.8; // 80% of image width
        const leftPadding = width * 0.1; // 10% padding on each side
        const words = description.split(' ');
        let line = '';
        
        // Calculate text lines first to determine total text height
        const lines = [];
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            lines.push(line);
            line = words[i] + ' ';
          } else {
            line = testLine;
          }
        }
        if (line.trim().length > 0) {
          lines.push(line);
        }
        
        // Limit to 3 lines max
        const displayedLines = lines.slice(0, 3);
        if (displayedLines.length < lines.length) {
          displayedLines[displayedLines.length - 1] += '...';
        }
        
        // Position text in center-bottom area (60% down the image)
        const lineHeight = fontSize * 1.25;
        const totalTextHeight = displayedLines.length * lineHeight;
        let y = height * 0.6; // Start at 60% down the image
        
        // Adjust vertical position to center the text block
        y = y - (totalTextHeight / 2);
        
        // Draw each line
        displayedLines.forEach(line => {
          ctx.fillText(line, leftPadding, y);
          y += lineHeight;
        });
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.onerror = () => {
        // If image loading fails, just return the original URL
        resolve(imageUrl);
      };
      
      img.src = imageUrl;
    });
  };

  // Function to create video from scene images
  const createVideo = async () => {
    if (sceneImages.length === 0) return;
    
    try {
      setIsCreatingVideo(true);
      setError('');
      
      // Prepare images for video creation (with or without text overlays based on current settings)
      const processedScenes = await Promise.all(
        sceneImages.map(async (scene, index) => {
          // Determine if we need to add text overlay for this specific scene
          const shouldAddOverlay = showOverlays[index];
          
          let imageUrl = scene.imageUrl;
          
          // Apply text overlay if needed
          if (shouldAddOverlay) {
            imageUrl = await renderTextOverlay(imageUrl, scene.description, index);
          }
          
          return {
            imageUrl: imageUrl,
            description: scene.description
          };
        })
      );
      
      // Send images to server for video creation
      const response = await axios.post(
        `${config.videos}/create-video-from-scenes`,
        { scenes: processedScenes },
        authHeader()
      );
      
      if (response.data.success) {
        setVideoUrl(response.data.videoUrl);
        
        // Scroll to the video when it's ready
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      } else {
        setError(response.data.error || 'Failed to create video');
      }
    } catch (error) {
      console.error('Error creating video:', error);
      setError(error.response?.data?.error || 'An unexpected error occurred');
    } finally {
      setIsCreatingVideo(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
          Script to Scenes
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Manage your script, generate scenes, and visualize your story
        </p>
      </div>
      
      <div className="bg-tiktok-dark rounded-lg p-6 mb-8 shadow-lg border border-gray-800">
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Your Script</label>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={isTyping ? typedText : (expandedScript || script)}
              onChange={(e) => {
                if (!isTyping) {
                  if (expandedScript) {
                    setExpandedScript(e.target.value);
                  } else {
                    setScript(e.target.value);
                  }
                }
              }}
              placeholder="Enter your script or a brief description..."
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 pr-28 text-white 
                       placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
              rows={6}
              disabled={isTyping}
            />
            
            {expandedScript && (
              <button
                onClick={() => setExpandedScript('')}
                className="absolute right-4 top-3 p-1.5 text-red-400 hover:text-gray-400 transition-colors bg-black/30 rounded-full hover:bg-black/50"
                title="Reset to original input"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            
            <button
              onClick={handleExpandScript}
              disabled={isGeneratingScript || !script.trim() || isTyping}
              className={`absolute right-3 bottom-3 px-4 py-2 font-medium transition-all whitespace-nowrap
                        ${isGeneratingScript || !script.trim() || isTyping
                          ? 'text-gray-500 cursor-not-allowed' 
                          : 'text-gradient bg-clip-text text-transparent bg-gradient-to-r from-tiktok-blue to-tiktok-pink hover:opacity-80'
                        }`}
            >
              {isGeneratingScript ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-t-2 border-b-2 border-tiktok-pink rounded-full animate-spin mr-2"></div>
                  <span className="text-tiktok-pink">Expanding...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="mr-1">✨</span> 
                  <span className="underline underline-offset-2">AI Expand</span>
                </div>
              )}
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-300">
              {typeof error === 'object' ? JSON.stringify(error) : error}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-300 mb-3 font-medium">Number of Scenes to Generate</label>
          <div className="flex flex-wrap gap-4">
            {[3, 5, 8, 10].map(count => (
              <div key={count} className="flex items-center">
                <input
                  type="radio"
                  id={`scene-count-${count}`}
                  name="scene-count"
                  value={count}
                  checked={sceneCount === count}
                  onChange={() => setSceneCount(count)}
                  className="hidden peer"
                  disabled={isGeneratingScenes}
                />
                <label
                  htmlFor={`scene-count-${count}`}
                  className={`px-4 py-2 rounded-full border transition-all cursor-pointer
                            peer-checked:border-tiktok-pink peer-checked:text-tiktok-pink peer-checked:bg-tiktok-pink/10
                            ${isGeneratingScenes ? 'border-gray-700 text-gray-500' : 'border-gray-600 text-gray-300 hover:border-gray-400'}`}
                >
                  {count} Scenes
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={handleGenerateScenes}
          disabled={isGeneratingScenes || (!script.trim() && !expandedScript.trim()) || isTyping}
          className={`w-full py-3 rounded-lg font-medium transition-all
                    ${isGeneratingScenes || (!script.trim() && !expandedScript.trim()) || isTyping
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white hover:from-tiktok-blue/90 hover:to-tiktok-pink/90 hover:shadow-lg'
                    }`}
        >
          {isGeneratingScenes ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
              <span>Generating Scenes...</span>
            </div>
          ) : (
            `Generate ${sceneCount} Scene Images`
          )}
        </button>
      </div>
      
      {sceneImages.length > 0 && (
        <div className="bg-tiktok-dark rounded-lg p-6 shadow-lg border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Generated Scenes</h2>
            
            <div className="flex items-center">
              <span className="text-gray-400 mr-3 text-sm">Text Overlay:</span>
              <button 
                onClick={toggleAllOverlays}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${globalOverlay ? 'bg-tiktok-pink' : 'bg-gray-600'}`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${globalOverlay ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sceneImages.map((scene, index) => (
              <div key={index} className="bg-black/50 rounded-lg overflow-hidden">
                <div className="relative">
                  <img 
                    src={scene.imageUrl} 
                    alt={`Scene ${index + 1}`} 
                    className="w-full h-48 object-cover"
                  />
                  
                  {showOverlays[index] && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <p className="text-white text-sm text-center leading-tight max-w-[80%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
                        {scene.description}
                      </p>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => toggleOverlay(index)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
                    title={showOverlays[index] ? "Hide description" : "Show description"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showOverlays[index] ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      )}
                    </svg>
                  </button>
                </div>
                
                <div className="p-3 flex justify-between items-center">
                  <button 
                    className="text-xs text-gray-400 hover:text-tiktok-pink transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(scene.description);
                    }}
                  >
                    Copy Description
                  </button>
                  
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2 text-xs">Text:</span>
                    <button 
                      onClick={() => toggleOverlay(index)}
                      className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${showOverlays[index] ? 'bg-tiktok-pink' : 'bg-gray-600'}`}
                    >
                      <span 
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showOverlays[index] ? 'translate-x-4' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex justify-between">
            <button 
              onClick={downloadAllImages}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download All Scenes
            </button>
            
            <button
              onClick={createVideo}
              disabled={isCreatingVideo}
              className={`px-4 py-2 ${isCreatingVideo 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white hover:opacity-90'}
                transition-colors flex items-center`}
            >
              {isCreatingVideo ? (
                <>
                  <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  Creating Video...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Create Video
                </>
              )}
            </button>
          </div>
        </div>
      )}
      
      {videoUrl && (
        <div className="bg-tiktok-dark rounded-lg p-6 mt-8 shadow-lg border border-gray-800" ref={videoRef}>
          <h2 className="text-2xl font-bold mb-4 text-white">Your Video</h2>
          
          <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
            <video 
              src={videoUrl} 
              controls 
              className="w-full h-full"
              poster={sceneImages[0]?.imageUrl}
            />
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                // Direct download using the download attribute
                const link = document.createElement('a');
                link.href = videoUrl;
                link.setAttribute('download', 'scene-video.mp4');
                link.setAttribute('target', '_blank'); // Helps with some browsers
                
                // For cross-origin URLs, we need to use a fetch approach
                fetch(videoUrl)
                  .then(response => response.blob())
                  .then(blob => {
                    // Create object URL from blob
                    const blobUrl = window.URL.createObjectURL(blob);
                    link.setAttribute('href', blobUrl);
                    
                    // Append, click, and clean up
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                    }, 100);
                  })
                  .catch(err => {
                    console.error('Error downloading video:', err);
                    // Fallback to direct approach if fetch fails
                    link.href = videoUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  });
              }}
              className="px-4 py-2 bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white hover:opacity-90 transition-colors flex items-center rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptToScenes; 