import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateVideo, generateVariations as generateVariationsAPI, useCredit as updateCreditUsage } from '../../services/videoService';

// Text Editor Modal Component
const TextEditorModal = ({ isOpen, onClose, text, onSave, title, scene, index }) => {
  const [editedText, setEditedText] = useState(text);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 60 }); // Default position (percentage)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [textStyle, setTextStyle] = useState({
    color: "#FFFFFF", // Default white
    fontFamily: "Arial",
    isBold: false, // Default not bold
    fontSize: 20 // Default large text
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textAreaRef = useRef(null);
  const modalRef = useRef(null);
  const imageContainerRef = useRef(null);
  const textOverlayRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  // Reset edited text and position when modal is opened with new text
  useEffect(() => {
    setEditedText(text);
    // Reset cursor position when text changes
    setCursorPosition(text.length);
    
    // If we have saved position data, use it, otherwise default
    if (scene && scene.textPosition) {
      setTextPosition(scene.textPosition);
    } else {
      setTextPosition({ x: 50, y: 60 }); // Default position (center, 60% down)
    }
    
    // Initialize text styling from saved data or defaults
    if (scene && scene.textStyle) {
      setTextStyle(scene.textStyle);
    } else {
      setTextStyle({
        color: "#FFFFFF", // Default white
        fontFamily: "Arial",
        isBold: false, // Default not bold
        fontSize: 20 // Default large text
      });
    }
  }, [text, isOpen, scene]);
  
  // Track cursor position in textarea
  const handleTextAreaChange = (e) => {
    const value = e.target.value;
    setEditedText(value);
    setCursorPosition(e.target.selectionStart);
  };
  
  // Keep focus on textarea when clicking in it
  const handleTextAreaClick = (e) => {
    setCursorPosition(e.target.selectionStart);
  };
  
  // Add emoji at cursor position
  const addEmoji = (emoji) => {
    if (textAreaRef.current) {
      const beforeCursor = editedText.substring(0, cursorPosition);
      const afterCursor = editedText.substring(cursorPosition);
      const newText = beforeCursor + emoji + afterCursor;
      setEditedText(newText);
      
      // Update cursor position to after the inserted emoji
      const newPosition = cursorPosition + emoji.length;
      setCursorPosition(newPosition);
      
      // Focus back on textarea and set selection
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus();
          textAreaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    } else {
      // Fallback to appending if textarea ref isn't available
      setEditedText(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
  };
  
  // Handle drag start
  const handleMouseDown = (e) => {
    if (!textOverlayRef.current || !imageContainerRef.current) return;
    
    // Prevent default behavior and text selection during drag
    e.preventDefault();
    
    const textRect = textOverlayRef.current.getBoundingClientRect();
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    
    // Calculate click offset from the top-left of the text element
    const offsetX = e.clientX - textRect.left;
    const offsetY = e.clientY - textRect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
  };
  
  // Handle drag move
  const handleMouseMove = (e) => {
    if (!isDragging || !imageContainerRef.current) return;
    
    const containerRect = imageContainerRef.current.getBoundingClientRect();
    
    // Calculate new position in pixels relative to container
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    // Convert to percentage for responsive positioning
    const percentX = (newX / containerRect.width) * 100;
    const percentY = (newY / containerRect.height) * 100;
    
    // Clamp values to keep text within bounds
    const clampedX = Math.max(5, Math.min(95, percentX));
    const clampedY = Math.max(5, Math.min(95, percentY));
    
    setTextPosition({ x: clampedX, y: clampedY });
  };
  
  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Add and remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Update a specific style property
  const updateTextStyle = (property, value) => {
    setTextStyle(prev => ({
      ...prev,
      [property]: value
    }));
  };
  
  // Handle click outside for emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);
  
  // Define available font families
  const fontFamilies = [
    "Arial",
    "Verdana",
    "Georgia",
    "Times New Roman",
    "Courier New",
    "Impact",
    "Comic Sans MS"
  ];
  
  // Define color options
  const colorOptions = [
    "#FFFFFF", // White
    "#FFEB3B", // Yellow
    "#FF5722", // Orange
    "#E91E63", // Pink
    "#03A9F4", // Light Blue
    "#4CAF50", // Green
    "#9C27B0"  // Purple
  ];
  
  // Define text size options
  const fontSizeOptions = [
    { label: "Small", value: 14 },
    { label: "Medium", value: 16 },
    { label: "Large", value: 20 },
    { label: "X-Large", value: 24 }
  ];

  // List of common emojis for quick access
  const commonEmojis = [
    "😀", "😂", "😍", "🥰", "😎", "🤩", "😊", "🤔", "🙄", "😬", 
    "❤️", "🔥", "👍", "👏", "🙏", "🎉", "⭐", "✨", "🚀", "💯",
    "🤣", "😭", "🥺", "😱", "🤯", "🤪", "😇", "😈", "🤫", "🤭"
  ];
  
  if (!isOpen || !scene) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-tiktok-dark border border-gray-700 rounded-lg w-full max-w-4xl shadow-xl flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">{title || 'Edit Text Overlay'}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
          {/* Left Column - Image Preview */}
          <div className="md:col-span-2">
            <div ref={imageContainerRef} className="relative rounded-lg overflow-hidden bg-black aspect-square">
              {/* Background Image */}
              <img 
                src={scene.overlayImage} 
                alt="Scene Preview" 
                className="w-full h-full object-contain"
              />
              
              {/* Text Overlay */}
              <div 
                ref={textOverlayRef}
                className="absolute pointer-events-auto cursor-move"
                style={{
                  left: `${textPosition.x}%`,
                  top: `${textPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '90%',
                  textAlign: 'center',
                  userSelect: 'none',
                  fontFamily: textStyle.fontFamily,
                  color: textStyle.color,
                  fontWeight: textStyle.isBold ? 'bold' : 'normal',
                  fontSize: `${textStyle.fontSize * 1.5}px`,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  padding: '8px',
                  borderRadius: '4px',
                  background: 'rgba(0,0,0,0.3)',
                }}
                onMouseDown={handleMouseDown}
              >
                {editedText || "Text Overlay"}
              </div>
              
              <div className="absolute bottom-2 left-2 text-white text-sm bg-black bg-opacity-60 px-2 py-1 rounded-lg">
                Drag text to position it
              </div>
            </div>
          </div>
          
          {/* Right Column - Text Controls */}
          <div className="flex flex-col">
            {/* Text Input */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 text-sm">
                Text Overlay
              </label>
              <textarea
                ref={textAreaRef}
                value={editedText}
                onChange={handleTextAreaChange}
                onClick={handleTextAreaClick}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-tiktok-pink"
                rows="3"
                placeholder="Enter text overlay..."
              ></textarea>
            </div>
            
            {/* Quick Emoji Access */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 text-sm">
                Add Emoji
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {commonEmojis.slice(0, 15).map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-md text-lg"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-md"
                  title="More emojis"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-2 mb-4"
                >
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {commonEmojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-md text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Text Style Controls */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 text-sm">
                Text Style
              </label>
              
              {/* Font Family */}
              <div className="mb-3">
                <select
                  value={textStyle.fontFamily}
                  onChange={(e) => updateTextStyle('fontFamily', e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-tiktok-pink"
                >
                  {fontFamilies.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Text Size */}
              <div className="mb-3">
                <select
                  value={textStyle.fontSize}
                  onChange={(e) => updateTextStyle('fontSize', Number(e.target.value))}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-tiktok-pink"
                >
                  {fontSizeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Bold Toggle */}
              <div className="mb-3">
                <button
                  onClick={() => updateTextStyle('isBold', !textStyle.isBold)}
                  className={`px-4 py-2 rounded-lg border ${
                    textStyle.isBold 
                      ? 'bg-tiktok-pink text-white border-tiktok-pink' 
                      : 'bg-black text-gray-300 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  Bold
                </button>
              </div>
              
              {/* Text Color */}
              <div>
                <label className="block text-gray-300 mb-2 text-sm">
                  Text Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      onClick={() => updateTextStyle('color', color)}
                      className={`w-8 h-8 rounded-full ${
                        textStyle.color === color ? 'ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-gray-700">
              <button
                onClick={() => onSave(editedText, textPosition, textStyle)}
                className="w-full bg-tiktok-pink text-white font-medium py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // Text editing states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [refreshingImage, setRefreshingImage] = useState(false);

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
    console.log('Download initiated for variation:', variation);
    console.log('Current phrase:', variation.phrase);
    console.log('Text position:', variation.textPosition);
    console.log('Text style:', variation.textStyle);
    
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
      
      // Skip drawing text if text overlay is hidden for this variation
      if (variation.showOverlay === false) {
        // Just download the image without text
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `variation-${index+1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      // Use custom styling if available, otherwise use defaults
      const fontFamily = variation.textStyle?.fontFamily || "Arial";
      const fontSize = variation.textStyle?.fontSize ? `${variation.textStyle.fontSize * 2}px` : "42px";
      const isBold = variation.textStyle?.isBold ? "bold" : "";
      const textColor = variation.textStyle?.color || "#FFFFFF";
      
      // Configure text style using custom settings
      ctx.textAlign = "center";
      ctx.font = `${isBold} ${fontSize} ${fontFamily}`;
      
      // Add text shadow for better readability
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      
      // Set text color
      ctx.fillStyle = textColor;
      
      // Calculate text position (centered if no custom position)
      const posX = canvas.width * (variation.textPosition?.x || 50) / 100;
      const posY = canvas.height * (variation.textPosition?.y || 60) / 100;
      
      // Use manual line breaks if present in text
      if (variation.phrase.includes('\n')) {
        const lines = variation.phrase.split('\n');
        const lineHeight = parseInt(fontSize) * 1.2;
        
        // Calculate total height of all lines to center the text block
        const totalHeight = lineHeight * lines.length;
        const startY = posY - (totalHeight / 2) + (lineHeight / 2);
        
        // Draw each line
        lines.forEach((line, i) => {
          if (isBold) {
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(line, posX, startY + (i * lineHeight));
          }
          ctx.fillText(line, posX, startY + (i * lineHeight));
        });
      } else {
        // Auto-wrap text
        const words = variation.phrase.split(' ');
        const lineHeight = parseInt(fontSize) * 1.3;
        const maxWidth = canvas.width * 0.75; // Slightly narrower than default for better appearance
        
        // Create wrapped lines
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
        
        // Calculate starting position to center the text block
        const totalHeight = lineHeight * lines.length;
        const startY = posY - (totalHeight / 2) + (lineHeight / 2);
        
        // Draw each line
        lines.forEach((line, i) => {
          if (isBold) {
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(line, posX, startY + (i * lineHeight));
          }
          ctx.fillText(line, posX, startY + (i * lineHeight));
        });
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
    // Skip if text overlay is hidden for this variation
    if (variation.showOverlay === false) {
      // Show error message since we can't download the image without text
      setError('Unable to download image without text due to CORS restrictions');
      return;
    }
    
    // Create a canvas with just the text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 800;
    
    // Use custom styling if available, otherwise use defaults
    const fontFamily = variation.textStyle?.fontFamily || "Arial";
    const fontSize = variation.textStyle?.fontSize ? `${variation.textStyle.fontSize * 2}px` : "42px";
    const isBold = variation.textStyle?.isBold ? "bold" : "";
    const textColor = variation.textStyle?.color || "#FFFFFF";
    
    // Fill with transparent background
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';  // Fully transparent
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Configure text style using custom settings
    ctx.textAlign = "center";
    ctx.font = `${isBold} ${fontSize} ${fontFamily}`;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 8; 
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.fillStyle = textColor;
    
    // Calculate text position (centered if no custom position)
    const posX = canvas.width * (variation.textPosition?.x || 50) / 100;
    const posY = canvas.height * (variation.textPosition?.y || 60) / 100;
    
    // Use manual line breaks if present in text
    if (variation.phrase.includes('\n')) {
      const lines = variation.phrase.split('\n');
      const lineHeight = parseInt(fontSize) * 1.2;
      
      // Calculate total height of all lines to center the text block
      const totalHeight = lineHeight * lines.length;
      const startY = posY - (totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line
      lines.forEach((line, i) => {
        if (isBold) {
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(line, posX, startY + (i * lineHeight));
        }
        ctx.fillText(line, posX, startY + (i * lineHeight));
      });
    } else {
      // Auto-wrap text
      const words = variation.phrase.split(' ');
      const lineHeight = parseInt(fontSize) * 1.3;
      const maxWidth = canvas.width * 0.75; // Slightly narrower than default for better appearance
      
      // Create wrapped lines
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
      
      // Calculate starting position to center the text block
      const totalHeight = lineHeight * lines.length;
      const startY = posY - (totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line
      lines.forEach((line, i) => {
        if (isBold) {
          ctx.strokeStyle = 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 3;
          ctx.strokeText(line, posX, startY + (i * lineHeight));
        }
        ctx.fillText(line, posX, startY + (i * lineHeight));
      });
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
        hasImage: !!productImage,
        numVariations: 4  // Request 4 variations
      };
      
      // Add image if available
      if (productImage) {
        const base64Image = await fileToBase64(productImage);
        variationData.imageData = base64Image;
      }
      
      // Call API to generate variations
      const response = await generateVariationsAPI(variationData);
      
      console.log('Variations API response:', response);
      
      if (response.success) {
        // Process variations - handle both base64 and external URLs
        const processedVariations = response.variations.map(variation => ({
          ...variation,
          // For Qwen-generated images that are external URLs, keep the URL as is
          overlayImage: variation.generatedImage 
            ? variation.overlayImage // External URL from Qwen API
            : variation.overlayImage, // Base64 data from user upload
          // Save original text and style for reset functionality
          originalPhrase: variation.phrase,
          originalTextStyle: {
            fontSize: 20, // Large font size
            color: "#FFFFFF",
            fontFamily: "Arial",
            isBold: false // Not bold by default
          }
        }));
        
        console.log('Processed variations:', processedVariations.length, processedVariations);
        
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
      
      // Find the most current variation data by ID - this ensures we have the latest edits
      const variationIndex = variations.findIndex(v => v.id === selectedVariation.id);
      const currentVariation = variationIndex >= 0 ? variations[variationIndex] : selectedVariation;
      
      // Download the image with text overlay using the existing downloadVariation function
      downloadVariation(currentVariation, variationIndex);
      
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
    console.log('Selected variation:', variation);
    setSelectedVariation(variation);
  };

  // Update selectedVariation when variations change
  useEffect(() => {
    if (selectedVariation && variations.length > 0) {
      const currentIndex = variations.findIndex(v => v.id === selectedVariation.id);
      if (currentIndex >= 0) {
        // Update selected variation with latest data
        setSelectedVariation(variations[currentIndex]);
      }
    }
  }, [variations, selectedVariation]);

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

  // New methods for text editing features
  
  // Open text edit modal for a variation
  const openEditModal = (index) => {
    setCurrentEditIndex(index);
    setEditModalOpen(true);
  };
  
  // Close the text edit modal
  const closeEditModal = () => {
    setEditModalOpen(false);
    setCurrentEditIndex(null);
  };
  
  // Save edited text and position
  const saveEditedText = (text, position, style) => {
    if (currentEditIndex === null || !variations[currentEditIndex]) return;
    
    console.log('Saving edited text:', text);
    console.log('From previous text:', variations[currentEditIndex].phrase);
    
    // Create a new variations array with the updated text
    const updatedVariations = [...variations];
    updatedVariations[currentEditIndex] = {
      ...updatedVariations[currentEditIndex],
      phrase: text,
      textPosition: position,
      textStyle: style
    };
    
    console.log('Updated variation:', updatedVariations[currentEditIndex]);
    
    setVariations(updatedVariations);
    closeEditModal();
  };
  
  // Reset text to original
  const resetTextOverlay = (index) => {
    if (!variations[index]) return;
    
    // Get the original phrase from the variation
    const originalPhrase = variations[index].originalPhrase || variations[index].phrase;
    
    // Update the variation with the original phrase
    const updatedVariations = [...variations];
    
    // Use large font size and unbold by default
    updatedVariations[index] = {
      ...updatedVariations[index],
      phrase: originalPhrase,
      // Reset position and style with large font and unbold
      textPosition: { x: 50, y: 60 },
      textStyle: {
        color: "#FFFFFF",
        fontFamily: "Arial",
        isBold: false, // No bold by default
        fontSize: 20 // Large size by default
      }
    };
    
    setVariations(updatedVariations);
  };
  
  // Toggle text overlay for all variations
  const toggleAllOverlays = () => {
    setShowOverlays(!showOverlays);
  };
  
  // Toggle text overlay for a specific variation
  const toggleOverlay = (index) => {
    if (!variations[index]) return;
    
    // Create a new variations array
    const updatedVariations = [...variations];
    
    // Toggle showOverlay for this specific variation
    updatedVariations[index] = {
      ...updatedVariations[index],
      showOverlay: updatedVariations[index].showOverlay === false ? true : false
    };
    
    setVariations(updatedVariations);
  };
  
  // Refresh/regenerate a specific image variation
  const regenerateVariation = async (index) => {
    try {
      if (!variations[index]) return;
      
      setRefreshingImage(index);
      setError('');
      
      // Create data object for API
      const variationData = {
        prompt,
        hasImage: !!productImage,
        regenerateSingle: true,
        previousPhrase: variations[index].phrase
      };
      
      console.log('Regenerating variation with data:', variationData);
      
      // Add image if available
      if (productImage) {
        const base64Image = await fileToBase64(productImage);
        variationData.imageData = base64Image;
      }
      
      // Call API to generate a new variation
      const response = await generateVariationsAPI(variationData);
      
      console.log('Regeneration API response:', response);
      
      if (response.success && response.variations && response.variations.length > 0) {
        // Create a copy of variations array
        const updatedVariations = [...variations];
        
        // Replace the selected variation with the new one
        // but preserve any custom text, position, etc.
        const newVariation = response.variations[0];
        updatedVariations[index] = {
          ...updatedVariations[index],
          overlayImage: newVariation.overlayImage || newVariation.overlayImage,
          // Save the original values in case we want to revert
          originalPhrase: updatedVariations[index].originalPhrase || updatedVariations[index].phrase,
          // Make sure we preserve the original text style for reset
          originalTextStyle: updatedVariations[index].originalTextStyle || {
            fontSize: 20,
            color: "#FFFFFF",
            fontFamily: "Arial",
            isBold: false
          }
        };
        
        console.log('Updated variations after regeneration:', updatedVariations.length);
        
        setVariations(updatedVariations);
      } else {
        setError(response.error || 'Failed to regenerate variation');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to regenerate variation. Please try again.');
    } finally {
      setRefreshingImage(false);
    }
  };

  return (
    <div className="pt-0 min-h-screen bg-black text-white">
      {console.log('Rendering with variations:', variations?.length, variations)}
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
        <div className="mb-8 max-w-md mx-auto">
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
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 010-1.414z" clipRule="evenodd" />
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
              
              {/* Global controls for all variations */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white">All Variations</h3>
                
                <div className="flex space-x-3">
                  {/* Toggle all text overlays */}
                  <button
                    onClick={toggleAllOverlays}
                    className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 flex items-center text-sm"
                  >
                    {showOverlays ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        Hide All Text
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Show All Text
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {variations && variations.length > 0 ? (
                  variations.map((variation, index) => (
                    <div 
                      key={variation.id || index}
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
                        
                        {/* Text Overlay - only show if showOverlays is true */}
                        {showOverlays && (variation.showOverlay !== false) && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center text-white p-4"
                            style={{
                              // Use saved position if available
                              left: variation.textPosition ? `${variation.textPosition.x}%` : '50%',
                              top: variation.textPosition ? `${variation.textPosition.y}%` : '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 'auto',
                              maxWidth: '90%',
                              height: 'auto'
                            }}
                          >
                            <div
                              className="text-center"
                              style={{
                                textShadow: "0px 2px 4px rgba(0,0,0,0.8)",
                                fontFamily: variation.textStyle?.fontFamily || 'Arial',
                                color: variation.textStyle?.color || '#FFFFFF',
                                fontWeight: variation.textStyle?.isBold ? 'bold' : 'normal',
                                fontSize: variation.textStyle?.fontSize ? `${variation.textStyle.fontSize * 1.5}px` : '2rem'
                              }}
                            >
                              {variation.phrase}
                            </div>
                          </div>
                        )}
                        
                        {/* Selected Indicator */}
                        {selectedVariation?.id === variation.id && (
                          <div className="absolute top-2 right-2 bg-tiktok-pink text-white rounded-full p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Loading indicator for refreshing */}
                        {refreshingImage === index && (
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiktok-pink"></div>
                          </div>
                        )}
                        
                        {/* Caption */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2">
                          <div className="flex justify-between items-center">
                            <span>Variation {index + 1}</span>
                            <div className="flex space-x-2">
                              {/* Edit Text Button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(index);
                                }}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full"
                                title="Edit Text"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 0L9.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              {/* Toggle Overlay Button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOverlay(index);
                                }}
                                className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full"
                                title={variation.showOverlay === false ? "Show Text" : "Hide Text"}
                              >
                                {variation.showOverlay === false ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                )}
                              </button>
                              
                              {/* Refresh Button */}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  regenerateVariation(index);
                                }}
                                disabled={refreshingImage !== false}
                                className={`p-1 ${
                                  refreshingImage !== false
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-700 hover:bg-gray-600'
                                } rounded-full`}
                                title="Refresh Image"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 text-gray-400">
                    No variations generated yet. Please try again with a different prompt.
                  </div>
                )}
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
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Text Editor Modal */}
      <TextEditorModal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        text={currentEditIndex !== null && variations[currentEditIndex] ? variations[currentEditIndex].phrase : ''}
        onSave={saveEditedText}
        title="Edit Text Overlay"
        scene={currentEditIndex !== null && variations[currentEditIndex] ? variations[currentEditIndex] : null}
        index={currentEditIndex}
      />
    </div>
  );
};

export default VideoGenerator;