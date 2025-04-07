import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../../services/config';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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
    fontSize: 14 // Default small text
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
        fontSize: 14 // Default small text
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
        
        <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
          {/* Image preview with draggable text */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="text-sm text-gray-400 mb-2">
              Position the text by dragging it. Click and drag to place it where you want.
            </div>
            
            <div 
              ref={imageContainerRef}
              className="relative flex-1 overflow-hidden bg-black rounded-lg flex items-center justify-center"
            >
              <img 
                src={scene.imageUrl} 
                alt={`Scene ${index + 1}`} 
                className="max-w-full max-h-full object-contain"
              />
              
              {/* Draggable text overlay */}
              <div 
                ref={textOverlayRef}
                className="absolute p-4 cursor-move select-none"
                style={{ 
                  left: `${textPosition.x}%`, 
                  top: `${textPosition.y}%`, 
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '80%',
                  pointerEvents: isDragging ? 'none' : 'auto', // Prevent text from capturing events during drag
                  color: textStyle.color,
                  fontFamily: textStyle.fontFamily,
                  fontWeight: textStyle.isBold ? 'bold' : 'normal',
                  fontSize: `${textStyle.fontSize}px`
                }}
                onMouseDown={handleMouseDown}
              >
                <p className="text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {editedText}
                </p>
              </div>
            </div>
          </div>
          
          {/* Text edit panel */}
          <div className="w-full md:w-96 p-4 border-t md:border-t-0 md:border-l border-gray-700 flex flex-col">
            <label className="block text-gray-300 mb-2 text-sm">
              Edit Text Overlay
            </label>
            <div className="relative">
              <textarea
                ref={textAreaRef}
                value={editedText}
                onChange={handleTextAreaChange}
                onClick={handleTextAreaClick}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white 
                        placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tiktok-pink flex-1 min-h-[100px]"
                placeholder="Enter text for the overlay..."
                autoFocus
              />
              
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute bottom-3 right-3 text-gray-400 hover:text-white"
                title="Add emoji"
              >
                <span className="text-xl">😊</span>
              </button>
              
              {showEmojiPicker && (
                <div 
                  ref={emojiPickerRef}
                  className="absolute right-0 bottom-12 bg-gray-900 border border-gray-700 p-2 rounded-lg shadow-xl z-10"
                >
                  <div className="grid grid-cols-7 gap-1">
                    {["😀", "😂", "😍", "🔥", "👍", "🎉", "💯", 
                      "❤️", "👏", "🙌", "✨", "💪", "🤔", "😎",
                      "🚀", "💡", "⭐", "🌈", "🎯", "🏆", "💰"].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-800 rounded text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Text Styling Controls */}
            <div className="mt-4 border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Text Styling</h3>
              
              {/* Text Color */}
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-2">Text Color</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      onClick={() => updateTextStyle('color', color)}
                      className={`w-6 h-6 rounded-full ${textStyle.color === color ? 'ring-2 ring-tiktok-pink ring-offset-1 ring-offset-gray-900' : ''}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              
              {/* Font Family */}
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-2">Font</label>
                <select
                  value={textStyle.fontFamily}
                  onChange={(e) => updateTextStyle('fontFamily', e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded px-3 py-2 text-white text-sm"
                >
                  {fontFamilies.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Font Size */}
              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-2">Text Size</label>
                <div className="flex gap-2">
                  {fontSizeOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateTextStyle('fontSize', option.value)}
                      className={`px-3 py-1 border rounded text-xs ${
                        textStyle.fontSize === option.value
                          ? 'border-tiktok-pink text-tiktok-pink bg-tiktok-pink/10'
                          : 'border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Bold Toggle */}
              <div className="mb-3">
                <button
                  onClick={() => updateTextStyle('isBold', !textStyle.isBold)}
                  className={`px-3 py-1 border rounded text-xs ${
                    textStyle.isBold
                      ? 'border-tiktok-pink text-tiktok-pink bg-tiktok-pink/10'
                      : 'border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <span className="font-bold">B</span> Bold
                </button>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-400">
              <p>This text will be displayed as overlay on the image when downloading or creating video.</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(editedText, textPosition, textStyle); // Pass text, position and style data
              onClose();
            }}
            className="px-4 py-2 bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white rounded-md hover:opacity-90 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [editedDescriptions, setEditedDescriptions] = useState({});
  const [textPositions, setTextPositions] = useState({}); // Store text positions for each scene
  const [textStyles, setTextStyles] = useState({}); // Store text styles for each scene
  const [regeneratingScenes, setRegeneratingScenes] = useState({}); // Track which scenes are regenerating
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
      
      // Initialize edited descriptions with original descriptions
      const initialDescriptions = {};
      const initialPositions = {};
      const initialStyles = {};
      sceneImages.forEach((scene, index) => {
        initialDescriptions[index] = scene.description;
        initialPositions[index] = { x: 50, y: 60 }; // Default position (center, 60% down)
        initialStyles[index] = {
          color: "#FFFFFF", // Default white
          fontFamily: "Arial",
          isBold: false, // Default not bold
          fontSize: 14 // Default small text
        };
      });
      setEditedDescriptions(initialDescriptions);
      setTextPositions(initialPositions);
      setTextStyles(initialStyles);
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

  // Open edit modal for a specific scene
  const openEditModal = (index) => {
    setCurrentEditingIndex(index);
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setCurrentEditingIndex(null);
    setIsEditModalOpen(false);
  };

  // Save edited text
  const saveEditedText = (text, position, style) => {
    if (currentEditingIndex !== null) {
      setEditedDescriptions(prev => ({
        ...prev,
        [currentEditingIndex]: text
      }));
      
      // Save the text position
      if (position) {
        setTextPositions(prev => ({
          ...prev,
          [currentEditingIndex]: position
        }));
      }
      
      // Save the text style
      if (style) {
        setTextStyles(prev => ({
          ...prev,
          [currentEditingIndex]: style
        }));
      }
    }
  };

  // Reset edited text to original
  const resetEditedText = (index) => {
    if (sceneImages[index]) {
      setEditedDescriptions(prev => ({
        ...prev,
        [index]: sceneImages[index].description
      }));
      
      // Also reset the position to default
      setTextPositions(prev => ({
        ...prev,
        [index]: { x: 50, y: 60 }
      }));
      
      // Reset text style to default
      setTextStyles(prev => ({
        ...prev,
        [index]: {
          color: "#FFFFFF", // Default white
          fontFamily: "Arial",
          isBold: false, // Default not bold
          fontSize: 14 // Default small text
        }
      }));
    }
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
            // Use edited text if available
            const textToUse = editedDescriptions[index] || scene.description;
            imageData = await renderTextOverlay(imageData, textToUse, index);
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
          const descWords = (editedDescriptions[index] || scene.description).split(' ').slice(0, 4).join('_');
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
        
        // Get position from stored positions or default
        const position = textPositions[index] || { x: 50, y: 60 };
        
        // Get styles from stored styles or default
        const style = textStyles[index] || {
          color: "#FFFFFF",
          fontFamily: "Arial",
          isBold: false, // Default not bold
          fontSize: 14 // Default small text
        };
        
        // Add text with better sizing proportional to image
        const fontSize = Math.max(style.fontSize, Math.floor(width / 30));
        
        // Create semi-transparent text with subtle shadow for readability
        ctx.fillStyle = style.color;
        ctx.font = `${style.isBold ? 'bold' : 'normal'} ${fontSize}px ${style.fontFamily}`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 7;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Calculate text position in pixels
        const xPos = (position.x / 100) * width;
        const yPos = (position.y / 100) * height;
        
        // Center text horizontally
        ctx.textAlign = "center";
        
        // Calculate text lines
        const maxWidth = width * 0.8; // 80% of image width
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
        
        // Calculate total text height and draw each line centered at the position
        const lineHeight = fontSize * 1.25;
        const totalTextHeight = displayedLines.length * lineHeight;
        
        // Start position adjusted for text block height
        let y = yPos - (totalTextHeight / 2);
        
        // Draw each line
        displayedLines.forEach(line => {
          ctx.fillText(line, xPos, y);
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
    if (!sceneImages || sceneImages.length === 0) {
      setError('No scene images to create video from');
      return;
    }
    
    console.log(`Starting video creation with ${sceneImages.length} scenes...`);
    setIsCreatingVideo(true);
    setError('');
    
    try {
      console.log('Preparing scene data for API request...');
      
      // Debug: Check image URLs format
      const imageUrlTypes = sceneImages.map((scene, index) => ({
        index,
        urlType: scene.imageUrl.startsWith('data:') ? 'data-url' : 'remote-url',
        urlLength: scene.imageUrl.length,
        descriptionLength: scene.description.length
      }));
      console.log('Scene image URL types:', imageUrlTypes);
      
      // Prepare images for video creation (with or without text overlays based on current settings)
      console.log('Applying text overlays based on user settings...');
      const processedScenes = await Promise.all(
        sceneImages.map(async (scene, index) => {
          // Determine if we need to add text overlay for this specific scene
          const shouldAddOverlay = showOverlays[index];
          console.log(`Scene ${index}: overlay ${shouldAddOverlay ? 'enabled' : 'disabled'}`);
          
          let imageUrl = scene.imageUrl;
          
          // Apply text overlay if needed
          if (shouldAddOverlay) {
            console.log(`Applying text overlay to scene ${index}`);
            // Use edited text if available
            const textToUse = editedDescriptions[index] || scene.description;
            imageUrl = await renderTextOverlay(imageUrl, textToUse, index);
          }
          
          return {
            imageUrl: imageUrl,
            description: editedDescriptions[index] || scene.description, // Use edited text for API
            textPosition: textPositions[index] || { x: 50, y: 60 }, // Include text position data
            textStyle: textStyles[index] || {
              color: "#FFFFFF",
              fontFamily: "Arial",
              isBold: false, // Default not bold
              fontSize: 14 // Default small text
            } // Include text style data
          };
        })
      );
      
      console.log('Sending request to create video from scenes to:', `${config.videos}/create-video-from-scenes`);
      
      const response = await axios.post(
        `${config.videos}/create-video-from-scenes`,
        { scenes: processedScenes },
        authHeader()
      );
      
      console.log('Server response:', response.data);
      
      if (response.data.success) {
        setVideoUrl(response.data.videoUrl);
        
        // Dispatch a custom event to notify other components (like Sidebar) to refresh user data
        // This will update the credit display in the sidebar navigation
        window.dispatchEvent(new Event('video-created'));
        console.log('Dispatched video-created event to update credits display');
        
        // Scroll to the video section
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 500);
      } else {
        const errorMsg = response.data.error || 'Failed to create video';
        console.error('Error from server:', errorMsg);
        
        // Handle specific errors more gracefully
        let userFriendlyError = errorMsg;
        if (errorMsg.includes('Credit limit reached')) {
          userFriendlyError = 'You need 1 credit to create a video. Please upgrade your plan or purchase more credits.';
        } else if (errorMsg.includes('Invalid transformation component') || errorMsg.includes('Cloudinary')) {
          userFriendlyError = 'There was an issue creating your video. Please try again with fewer scenes or different images.';
        }
        
        setError(userFriendlyError);
      }
    } catch (error) {
      console.error('Error creating video:', error);
      
      // Extract error message from the response if possible
      let errorMsg = 'Failed to create video';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server error status:', error.response.status);
        console.error('Server error headers:', error.response.headers);
        console.error('Server error data:', error.response.data);
        
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMsg = error.response.data;
          } else if (error.response.data.error) {
            errorMsg = error.response.data.error;
          }
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        errorMsg = 'No response from server. Please check your network connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Request setup error:', error.message);
        errorMsg = error.message;
      }
      
      // Provide more user-friendly error message for common issues
      if (errorMsg.includes('Credit limit reached') || errorMsg.includes('credit')) {
        errorMsg = 'You need 1 credit to create a video. Please upgrade your plan or purchase more credits.';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('ECONNABORTED')) {
        errorMsg = 'Request timed out. The video may take longer to create than expected. Please try with fewer images.';
      } else if (errorMsg.includes('Invalid transformation component') || errorMsg.includes('Cloudinary')) {
        errorMsg = 'There was an issue with our video service. Please try again with fewer scenes or different images.';
      } else if (errorMsg.includes('Network Error') || errorMsg.includes('CORS')) {
        errorMsg = 'Network error or CORS issue. Please check console for details. Try again later or with fewer scenes.';
        console.log('This might be a CORS or network issue. Check if backend URL is correctly set to:', config.videos);
      }
      
      setError(errorMsg);
    } finally {
      setIsCreatingVideo(false);
    }
  };

  // Function to regenerate a single scene image
  const regenerateSceneImage = async (index) => {
    if (!sceneImages[index] || regeneratingScenes[index]) return;
    
    try {
      // Set regenerating state for this scene
      setRegeneratingScenes(prev => ({
        ...prev,
        [index]: true
      }));
      
      // Create a copy of scene images to modify
      const updatedScenes = [...sceneImages];
      
      // Set a loading placeholder
      updatedScenes[index] = {
        ...updatedScenes[index],
        imageUrl: 'https://placehold.co/600x400/black/white?text=Regenerating...'
      };
      setSceneImages(updatedScenes);
      
      // Call API to regenerate the image
      const response = await axios.post(
        `${config.videos}/regenerate-scene-image`,
        { 
          imagePrompt: sceneImages[index].imagePrompt
        },
        {
          ...authHeader(),
          timeout: 30000 // 30-second timeout for individual image generation
        }
      );
      
      if (response.data && response.data.imageUrl) {
        // Update the image with the new one
        updatedScenes[index] = {
          ...updatedScenes[index],
          imageUrl: response.data.imageUrl
        };
        setSceneImages(updatedScenes);
      } else {
        // If no image was returned, revert to original or show error
        setError('Failed to regenerate image. Please try again.');
      }
    } catch (error) {
      console.error(`Error regenerating image ${index + 1}:`, error);
      setError('Failed to regenerate image. Please try again.');
      
      // Revert to original image if regeneration fails
      const updatedScenes = [...sceneImages];
      setSceneImages(updatedScenes);
    } finally {
      // Reset regenerating state
      setRegeneratingScenes(prev => ({
        ...prev,
        [index]: false
      }));
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
                    <div 
                      className="absolute p-4 pointer-events-none" 
                      style={{ 
                        left: `${textPositions[index]?.x || 50}%`, 
                        top: `${textPositions[index]?.y || 60}%`,
                        transform: 'translate(-50%, -50%)',
                        maxWidth: '80%',
                        color: textStyles[index]?.color || '#FFFFFF',
                        fontFamily: textStyles[index]?.fontFamily || 'Arial',
                        fontWeight: textStyles[index]?.isBold ? 'bold' : 'normal',
                        fontSize: `${textStyles[index]?.fontSize || 14}px`
                      }}
                    >
                      <p className="text-center leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
                        {editedDescriptions[index] || scene.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button 
                      onClick={() => openEditModal(index)}
                      className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
                      title="Edit overlay text"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button 
                      onClick={() => regenerateSceneImage(index)}
                      className={`bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors ${regeneratingScenes[index] ? 'cursor-not-allowed opacity-50' : ''}`}
                      title="Regenerate this image"
                      disabled={regeneratingScenes[index]}
                    >
                      {regeneratingScenes[index] ? (
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => toggleOverlay(index)}
                      className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
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
                </div>
                
                <div className="p-3 flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button 
                      className="text-xs text-gray-400 hover:text-tiktok-pink transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(editedDescriptions[index] || scene.description);
                      }}
                    >
                      Copy Text
                    </button>
                    
                    {editedDescriptions[index] !== scene.description && (
                      <button 
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        onClick={() => resetEditedText(index)}
                        title="Reset to original text"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  
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
              title="Video creation uses 1 credit"
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
                  Create Video <span className="ml-1 text-xs opacity-80">(1 credit)</span>
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
      
      {/* Text Editor Modal */}
      <TextEditorModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        text={currentEditingIndex !== null ? (editedDescriptions[currentEditingIndex] || sceneImages[currentEditingIndex]?.description || '') : ''}
        onSave={saveEditedText}
        title={`Edit Text for Scene ${currentEditingIndex !== null ? currentEditingIndex + 1 : ''}`}
        scene={currentEditingIndex !== null ? {
          ...sceneImages[currentEditingIndex],
          textPosition: textPositions[currentEditingIndex],
          textStyle: textStyles[currentEditingIndex]
        } : null}
        index={currentEditingIndex}
      />
    </div>
  );
};

export default ScriptToScenes; 