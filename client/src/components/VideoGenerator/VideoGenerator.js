import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateVideo, generateVariations as generateVariationsAPI, useCredit as updateCreditUsage } from '../../services/videoService';

const VideoGenerator = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // User input states
  const [prompt, setPrompt] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Generation states
  const [step, setStep] = useState(1);
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [variations, setVariations] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [generatedVideo, setGeneratedVideo] = useState(null);

  // Credit check
  const [availableCredits, setAvailableCredits] = useState(0);

  // Check user credits on component mount and when user prop changes
  useEffect(() => {
    updateCreditsFromUserData();
  }, [user]);

  // Update credits directly from user prop data
  const updateCreditsFromUserData = () => {
    if (user && user.subscription) {
      const { creditsTotal, creditsUsed } = user.subscription;
      setAvailableCredits(Math.max(0, creditsTotal - creditsUsed));
      console.log('Credits updated from database:', creditsTotal, 'Used:', creditsUsed, 'Available:', Math.max(0, creditsTotal - creditsUsed));
    } else {
      console.warn('User data or subscription not available');
      setAvailableCredits(0);
    }
  };

  // Refresh user credits (this function would be called after changes)
  // Note: In a real app, this would involve passing updated user data from parent component
  const refreshUserCredits = () => {
    updateCreditsFromUserData();
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProductImage(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add function to remove uploaded image
  const handleRemoveImage = () => {
    setProductImage(null);
    setImagePreview(null);
  };

  // Function to download a variation image with text overlay
  const downloadVariation = (variation, index) => {
    // Check if image URL is valid
    if (!variation.overlayImage) {
      console.error('No valid image URL to download');
      return;
    }
    
    // For base64 images, we can process them directly
    if (variation.overlayImage.startsWith('data:')) {
      processImageDownload(variation, index);
    } else {
      // For external URLs, we need to convert them to base64 first
      // Create a new image element
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Try to enable cross-origin access
      
      // Handle load success
      img.onload = function() {
        // Convert the image to base64 using a canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
          // Try to get base64 data
          const dataURL = canvas.toDataURL('image/png');
          // Replace the URL with base64 data
          const base64Variation = {
            ...variation,
            overlayImage: dataURL
          };
          // Process the download with the base64 image
          processImageDownload(base64Variation, index);
        } catch (err) {
          console.error('Failed to convert image to base64:', err);
          // Fallback for tainted canvas (CORS issues)
          downloadImageWithFallback(variation, index);
        }
      };
      
      // Handle load errors
      img.onerror = function() {
        console.error('Failed to load image:', variation.overlayImage);
        // Fallback method
        downloadImageWithFallback(variation, index);
      };
      
      // Set source to trigger loading
      img.src = variation.overlayImage;
    }
  };

  // Process and download an image with text overlay
  const processImageDownload = (variation, index) => {
    // Create a canvas to combine the image and text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create an image element to load the background
    const img = new Image();
    
    // Set up canvas once image is loaded
    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the background image
      ctx.drawImage(img, 0, 0);
      
      // Different text styling for each variation - more fancy and modern
      const fontFamilies = ["'Segoe UI', Arial", "'Georgia', serif", "'Impact', sans-serif", "'Arial Black', sans-serif"];
      const fontSizes = ["40px", "40px", "42px", "40px"];
      const fontStyles = ["bold", "bold", "bold", "bold"];
      const textPositions = [
        {y: canvas.height/2}, // center
        {y: canvas.height/2}, // center
        {y: canvas.height/2}, // center
        {y: canvas.height/2}, // center
      ];
      const shadows = [
        {offsetX: 2, offsetY: 2, blur: 8, color: 'rgba(0,0,0,0.85)'},
        {offsetX: 2, offsetY: 2, blur: 8, color: 'rgba(0,0,0,0.85)'},
        {offsetX: 2, offsetY: 2, blur: 8, color: 'rgba(0,0,0,0.85)'},
        {offsetX: 2, offsetY: 2, blur: 8, color: 'rgba(0,0,0,0.85)'}
      ];
      
      // NO GRADIENT OVERLAYS - preserve original image
      
      // Configure text style
      ctx.textAlign = "center";
      ctx.font = `${fontStyles[index % 4]} ${fontSizes[index % 4]} ${fontFamilies[index % 4]}`;
      
      // Add text shadow - more pronounced for better readability
      const shadow = shadows[index % 4];
      ctx.shadowOffsetX = shadow.offsetX;
      ctx.shadowOffsetY = shadow.offsetY;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowColor = shadow.color;
      
      // Add text with fancy styling
      // For even more emphasis, add a second shadow layer or glow effect
      if (index % 2 === 0) {
        // Add subtle glow for even-indexed variations
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        // Reset after glow effect
        setTimeout(() => {
          ctx.shadowColor = shadow.color;
          ctx.shadowBlur = shadow.blur;
          ctx.shadowOffsetX = shadow.offsetX;
          ctx.shadowOffsetY = shadow.offsetY;
        }, 0);
      }
      
      // Text color - white with slight variations for interest
      const textColors = [
        'rgb(255,255,255)', // Pure white
        'rgb(255,252,245)', // Slightly warm white
        'rgb(245,255,255)', // Slightly cool white
        'rgb(255,250,250)'  // Snow white
      ];
      ctx.fillStyle = textColors[index % 4];
      
      // Handle text wrapping with emoji support
      const maxWidth = canvas.width * 0.8; // 80% of canvas width
      const words = variation.phrase.split(' ');
      const lineHeight = parseInt(fontSizes[index % 4]) * 1.3; // Increased line height for emojis
      let lines = [];
      let currentLine = words[0];
      
      for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
      
      // Calculate starting Y position for text block
      const textY = textPositions[index % 4].y - ((lines.length - 1) * lineHeight / 2);
      
      // Draw the text lines
      lines.forEach((line, i) => {
        // Draw text with subtle outline for extra pop
        if (index % 4 === 2) { // For the third variation style
          // Add outline effect
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(line, canvas.width / 2, textY + (i * lineHeight));
        }
        
        // Draw the main text
        ctx.fillText(line, canvas.width / 2, textY + (i * lineHeight));
      });
      
      // Add decorative elements based on style
      if (index % 4 === 0) {
        // Add simple underline for first style
        ctx.beginPath();
        const lastLineY = textY + ((lines.length - 1) * lineHeight) + 10;
        ctx.moveTo(canvas.width/2 - 100, lastLineY);
        ctx.lineTo(canvas.width/2 + 100, lastLineY);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (index % 4 === 3) {
        // Add decorative brackets for last style
        const firstLineY = textY - 30;
        const lastLineY = textY + ((lines.length - 1) * lineHeight) + 30;
        
        // Left bracket
        ctx.beginPath();
        ctx.moveTo(canvas.width/2 - 120, firstLineY);
        ctx.lineTo(canvas.width/2 - 140, firstLineY);
        ctx.lineTo(canvas.width/2 - 140, lastLineY);
        ctx.lineTo(canvas.width/2 - 120, lastLineY);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Right bracket
        ctx.beginPath();
        ctx.moveTo(canvas.width/2 + 120, firstLineY);
        ctx.lineTo(canvas.width/2 + 140, firstLineY);
        ctx.lineTo(canvas.width/2 + 140, lastLineY);
        ctx.lineTo(canvas.width/2 + 120, lastLineY);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Convert canvas to PNG image
      const dataURL = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `variation-${index+1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    // Handle load error
    img.onerror = () => {
      console.error('Error loading image for download, using fallback');
      downloadImageWithFallback(variation, index);
    };
    
    // Set image source to the variation image
    img.src = variation.overlayImage;
  };

  // Fallback download method for CORS-restricted images
  const downloadImageWithFallback = (variation, index) => {
    // Create a canvas with just the text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 800;
    
    // Different text styling for each variation - more consistent styling
    const fontFamilies = ["'Arial', sans-serif", "'Arial', sans-serif", "'Arial', sans-serif", "'Arial', sans-serif"];
    const fontSizes = ["42px", "42px", "42px", "42px"];
    const fontStyles = ["bold", "bold", "bold", "bold"];
    
    // Fill with transparent background instead of gradients
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';  // Fully transparent
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Configure text style - improved for better readability
    ctx.textAlign = "center";
    ctx.font = `${fontStyles[index % 4]} ${fontSizes[index % 4]} ${fontFamilies[index % 4]}`;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 8; // Increased blur for better shadow effect
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.fillStyle = "white";
    
    // Handle text wrapping with emoji support
    const maxWidth = canvas.width * 0.8;
    const words = variation.phrase.split(' ');
    const lineHeight = parseInt(fontSizes[index % 4]) * 1.3; // Increased for emojis
    let lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    
    // Draw text at center
    const textY = canvas.height / 2 - ((lines.length - 1) * lineHeight / 2);
    
    // Draw text with style
    lines.forEach((line, i) => {
      // For some styles, add stroke for extra pop
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(line, canvas.width / 2, textY + (i * lineHeight));
      
      // Fill the text
      ctx.fillText(line, canvas.width / 2, textY + (i * lineHeight));
    });
    
    // Convert canvas to PNG image
    const dataURL = canvas.toDataURL('image/png');
    
    // Create download link
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `variation-${index+1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigation functions
  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Function to generate variations
  const generateVariations = async () => {
    try {
      setGeneratingVariations(true);
      setError('');
      
      // Create data object for API
      const variationData = {
        prompt,
        hasImage: !!productImage
      };
      
      // Add image if available
      if (productImage) {
        const base64Image = await fileToBase64(productImage);
        variationData.imageData = base64Image;
      }
      
      // Call API to generate variations
      const response = await generateVariationsAPI(variationData);
      
      if (response.success) {
        // Process variations - handle both base64 and external URLs
        const processedVariations = response.variations.map(variation => ({
          ...variation,
          // For Qwen-generated images that are external URLs, keep the URL as is
          overlayImage: variation.generatedImage 
            ? variation.overlayImage // External URL from Qwen API
            : variation.overlayImage // Base64 data from user upload
        }));
        
        setVariations(processedVariations);
        handleNextStep();
      } else {
        setError(response.error || 'Failed to generate variations');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate variations. Please try again.');
    } finally {
      setGeneratingVariations(false);
    }
  };

  // Function to generate final video
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!selectedVariation) {
        setError('Please select a variation image');
        setLoading(false);
        return;
      }

      // Check if user has available credits
      if (availableCredits <= 0) {
        setError('You have no credits remaining. Please upgrade your plan to download images.');
        setLoading(false);
        return;
      }
      
      // Update credit usage in the database first
      const creditResponse = await updateCreditUsage();
      
      if (!creditResponse.success) {
        setError(creditResponse.error || 'Failed to use credit. Please try again.');
        setLoading(false);
        return;
      }
      
      // Update local state with the updated credit values from server
      setAvailableCredits(creditResponse.creditsRemaining);
      
      // Download the image with text overlay using the existing downloadVariation function
      downloadVariation(selectedVariation, variations.findIndex(v => v.id === selectedVariation.id));
      
      // Dispatch event for parent components to know a video was created
      window.dispatchEvent(new Event('video-created'));

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to download image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Select a variation
  const selectVariation = (variation) => {
    setSelectedVariation(variation);
  };

  // Function to download the generated video
  const handleDownloadVideo = () => {
    if (!generatedVideo || !generatedVideo.videoUrl) {
      setError('No video URL available for download');
      return;
    }

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = generatedVideo.videoUrl;
    link.download = `${prompt.substring(0, 20)}-video.mp4`;
    link.target = "_blank"; // Open in new tab
    link.rel = "noopener noreferrer"; // Security best practice
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Create and download video from a selected variation
  const createAndDownloadVideo = async (variation, index) => {
    try {
      // Show loading indicator
      setLoading(true);
      
      // Create a canvas to render our video frames
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions (maintaining 9:16 aspect ratio for social media)
      canvas.width = 1080;
      canvas.height = 1920;
      
      // Load the background image
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = variation.overlayImage;
      }).catch(() => {
        console.error('Failed to load image. Using a color background instead.');
        // If image loading fails, we'll just use a color background
      });
      
      // Prepare text rendering properties based on variation's textProperties
      const textProps = variation.textProperties || {
        size: "large",
        placement: "center",
        fontWeight: "bold",
        color: "white",
        strokeWidth: 2,
        strokeColor: "rgba(0,0,0,0.7)"
      };
      
      // Set up MediaRecorder to capture canvas as video
      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000 // 5 Mbps
      });
      
      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      
      // When recording completes, create and download the video file
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `variation-${index+1}-video.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        setLoading(false);
      };
      
      // Start recording
      recorder.start();
      
      // Animation variables
      let startTime = null;
      const duration = 8000; // 8 second video
      
      // Draw initial frame
      const drawFrame = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background (either image or color)
        if (img.complete && img.naturalWidth > 0) {
          // Calculate centered image position
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const imgWidth = img.width * scale;
          const imgHeight = img.height * scale;
          const imgX = (canvas.width - imgWidth) / 2;
          const imgY = (canvas.height - imgHeight) / 2;
          
          ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
        } else {
          // Fallback color background
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Animation: Text fade in and subtle zooming
        const fadeInDuration = 1000; // 1 second fade in
        const fadeIn = Math.min(elapsed / fadeInDuration, 1);
        
        // Zoom effect
        const startScale = 0.95;
        const endScale = 1.05;
        const scaleProgress = (Math.sin((progress * Math.PI * 2) - Math.PI/2) + 1) / 2;
        const currentScale = startScale + (endScale - startScale) * scaleProgress;
        
        // Draw text with animation
        const phrase = variation.phrase;
        
        // Prepare text style
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Apply text styling based on textProperties
        let fontSize = 80; // Default large size
        if (textProps.size === "small") fontSize = 60;
        if (textProps.size === "medium") fontSize = 70;
        
        ctx.font = `${textProps.fontWeight || 'bold'} ${fontSize}px Arial, sans-serif`;
        
        // Add shadow/stroke for readability
        if (textProps.strokeWidth) {
          ctx.lineWidth = textProps.strokeWidth;
          ctx.strokeStyle = textProps.strokeColor || 'rgba(0,0,0,0.7)';
        }
        
        // Set opacity for fade-in effect
        ctx.globalAlpha = fadeIn;
        
        // Handle text wrapping
        const maxWidth = canvas.width * 0.8;
        const words = phrase.split(' ');
        const lineHeight = fontSize * 1.3;
        let lines = [];
        let currentLine = words[0];
        
        for (let i = 1; i < words.length; i++) {
          const testLine = currentLine + ' ' + words[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
        
        // Calculate vertical position based on placement
        let textY;
        if (textProps.placement === "top") {
          textY = canvas.height * 0.2;
        } else if (textProps.placement === "bottom") {
          textY = canvas.height * 0.8;
        } else {
          // Default to center
          textY = canvas.height * 0.5;
        }
        
        // Adjust for multiple lines
        textY -= ((lines.length - 1) * lineHeight) / 2;
        
        // Draw each line with shadow/stroke for readability
        lines.forEach((line, i) => {
          const y = textY + i * lineHeight;
          
          // Add stroke/outline if specified
          if (textProps.strokeWidth) {
            ctx.strokeText(line, canvas.width / 2, y);
          }
          
          // Draw text
          ctx.fillStyle = textProps.color || 'white';
          ctx.fillText(line, canvas.width / 2, y);
        });
        
        ctx.restore();
        
        // Continue animation if not complete
        if (elapsed < duration) {
          requestAnimationFrame(drawFrame);
        } else {
          // End recording when animation completes
          recorder.stop();
        }
      };
      
      // Start animation
      requestAnimationFrame(drawFrame);
      
    } catch (error) {
      console.error('Error creating video:', error);
      setError('Failed to create video. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="pt-0 min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-12 sm:px-6 lg:px-8 py-8">
      {/* <div className="max-w-5xl mx-auto py-12"> */}

        {/* Header */}
        <div className="text-center mb-12 mt-10">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-tiktok-blue to-tiktok-pink inline-block text-transparent bg-clip-text">
          Image Variations
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Generate variations of images with text overlay
        </p>
      </div>
        
        {/* Steps Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-tiktok-pink' : 'bg-gray-700'} text-white font-bold`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-tiktok-pink' : 'bg-gray-700'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-tiktok-pink' : 'bg-gray-700'} text-white font-bold`}>
              2
            </div>
            
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <div className={step >= 1 ? 'text-tiktok-pink' : ''}>Input Details</div>
            <div className={step >= 2 ? 'text-tiktok-pink' : ''}>Choose Variation</div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-tiktok-dark rounded-2xl p-6">
          {/* Step 1: Input Details */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-6">Enter Details for Your Image</h2>
              
              {/* Prompt Input - Required */}
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">
                  Prompt <span className="text-tiktok-pink">*</span>
                </label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                  placeholder="Describe what you want to create"
                  required
                />
                <p className="text-gray-500 text-sm mt-1">Required - Enter your creative prompt</p>
              </div>
              
              {/* Image Upload - Optional */}
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">
                  Image <span className="text-gray-500">(optional)</span>
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="mb-4 relative">
                      <img 
                        src={imagePreview} 
                        alt="Uploaded Preview" 
                        className="max-h-60 mx-auto rounded-lg"
                      />
                      <button 
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  
                  <p className="text-gray-400 mb-4">
                    Upload an image for text overlay <br />
                    <span className="text-gray-500 text-sm">If not provided, we'll generate images for you</span>
                  </p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="inline-flex items-center px-4 py-2 bg-tiktok-pink text-white rounded-full cursor-pointer hover:bg-opacity-90 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </label>
                </div>
              </div>
              
              {/* Error message */}
              {error && (
                <div className="bg-red-900 bg-opacity-30 border border-red-800 text-red-300 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}
              
              {/* Next button */}
              <div className="flex justify-end mt-8">
                <button
                  onClick={generateVariations}
                  disabled={!prompt || generatingVariations}
                  className={`px-6 py-3 rounded-full font-medium flex items-center ${
                    !prompt || generatingVariations 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-tiktok-pink text-white hover:bg-opacity-90'
                  }`}
                >
                  {generatingVariations ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating
                    </>
                  ) : (
                    <>
                      Generate Variations
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Choose Variation */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-6">Select Your Preferred Variation</h2>
              
              {/* Credit information banner */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center">
                <div className="mr-3 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-200">
                    <strong>Credits available: {availableCredits}</strong> 
                    {availableCredits <= 0 ? (
                      <span className="ml-2 text-red-400">You need to upgrade your plan to generate videos.</span>
                    ) : (
                      <span className="ml-2 text-gray-400">Downloading an image will use 1 credit.</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {variations.map((variation, index) => (
                  <div 
                    key={variation.id}
                    className={`relative rounded-xl overflow-hidden border-4 ${
                      selectedVariation?.id === variation.id 
                        ? 'border-tiktok-pink' 
                        : 'border-transparent'
                    } cursor-pointer transition-transform transform hover:scale-[1.02]`}
                    onClick={() => selectVariation(variation)}
                  >
                    {/* Variation Image with Text Overlay */}
                    <div className="relative aspect-square">
                      <img 
                        src={variation.overlayImage} 
                        alt={`Variation ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/800x800/black/white?text=Image+Error';
                        }}
                      />
                      
                      {/* Text Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center text-white p-4">
                        <div
                          className="text-center font-bold text-2xl"
                          style={{
                            textShadow: "0px 2px 4px rgba(0,0,0,0.8)",
                            maxWidth: "90%"
                          }}
                        >
                          {variation.phrase}
                        </div>
                      </div>
                      
                      {/* Selected Indicator */}
                      {selectedVariation?.id === variation.id && (
                        <div className="absolute top-2 right-2 bg-tiktok-pink text-white rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      
                      {/* Caption */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                        <div className="flex justify-between items-center">
                          <span>Variation {index + 1}</span>
                          <div className="flex space-x-2">
                            {/* Download Image Button */}
                            {/* <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadVariation(variation, index);
                              }}
                              className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full"
                              title="Download Image"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button> */}
                            
                           
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-900 bg-opacity-30 border border-red-800 text-red-300 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 rounded-full font-medium flex items-center bg-gray-800 text-white hover:bg-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 3.293a1 1 0 010 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 01-1.414 1.414l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Back
                </button>
                
                <button
                  onClick={handleGenerate}
                  disabled={!selectedVariation || loading || availableCredits <= 0}
                  className={`px-6 py-3 rounded-full font-medium flex items-center ${
                    !selectedVariation || loading || availableCredits <= 0
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-tiktok-pink text-white hover:bg-opacity-90'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </>
                  ) : (
                    <>
                      {availableCredits <= 0 ? 'No Credits Available' : 'Download Image (1 Credit)'}
                      {availableCredits > 0 && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Step 3: Video Preview */}
          {step === 3 && generatedVideo && (
            <div>
              <h2 className="text-xl font-bold mb-6">Your Video is Ready!</h2>
              
              <div className="bg-black border border-gray-800 rounded-xl overflow-hidden mb-6">
                <video 
                  controls
                  className="w-full"
                  poster={generatedVideo.thumbnailUrl}
                >
                  <source src={generatedVideo.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4 mb-8">
                <h3 className="font-medium mb-2">Video Details</h3>
                <p className="text-gray-400 mb-2"><strong>Title:</strong> {generatedVideo.title}</p>
                <p className="text-gray-400 mb-2"><strong>Created:</strong> {new Date(generatedVideo.createdAt).toLocaleString()}</p>
                <p className="text-gray-400"><strong>Prompt:</strong> {prompt}</p>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 rounded-full font-medium flex items-center bg-gray-800 text-white hover:bg-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 3.293a1 1 0 010 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 01-1.414 1.414l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Back to Variations
                </button>
                
                <button
                  onClick={handleDownloadVideo}
                  className="px-6 py-3 rounded-full font-medium flex items-center bg-tiktok-pink text-white hover:bg-opacity-90"
                >
                  Download Video
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;