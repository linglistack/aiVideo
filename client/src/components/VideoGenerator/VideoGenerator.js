import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateVideo } from '../../services/videoService';

const VideoGenerator = ({ user }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [avatarType, setAvatarType] = useState('professional');
  const [scriptTone, setScriptTone] = useState('enthusiastic');
  const [generatedVideo, setGeneratedVideo] = useState(null);

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

  const handleNextStep = () => {
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Convert image to base64
      const base64Image = await fileToBase64(productImage);
      
      const response = await generateVideo({
        productName,
        imageUrl: base64Image,
        avatarType,
        scriptTone
      });
      
      setGeneratedVideo(response.video);
      handleNextStep();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate video. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="pt-0 min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="text-gray-400 hover:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-4">Create New Video</h1>
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
            <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-tiktok-pink' : 'bg-gray-700'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-tiktok-pink' : 'bg-gray-700'} text-white font-bold`}>
              3
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <div className={step >= 1 ? 'text-tiktok-pink' : ''}>Product Details</div>
            <div className={step >= 2 ? 'text-tiktok-pink' : ''}>Style & Settings</div>
            <div className={step >= 3 ? 'text-tiktok-pink' : ''}>Preview Video</div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="bg-tiktok-dark rounded-2xl p-6">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold mb-6">Tell us about your product</h2>
              
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">Product Name</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                  placeholder="Enter your product name"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">Presenter Image</label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="mb-4">
                      <img 
                        src={imagePreview} 
                        alt="Presenter Preview" 
                        className="max-h-60 mx-auto rounded-lg"
                      />
                    </div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  
                  <p className="text-gray-400 mb-4">
                    Upload a photo of a person who will present your product. <br />
                    For best results, use a clear front-facing portrait.
                  </p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="presenter-image"
                  />
                  <label
                    htmlFor="presenter-image"
                    className="inline-flex items-center px-4 py-2 bg-tiktok-pink text-white rounded-full cursor-pointer hover:bg-opacity-90 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {imagePreview ? 'Change Image' : 'Upload Image'}
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end mt-8">
                <button
                  onClick={handleNextStep}
                  disabled={!productName || !productImage}
                  className={`px-6 py-3 rounded-full font-medium flex items-center ${
                    !productName || !productImage 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-tiktok-pink text-white hover:bg-opacity-90'
                  }`}
                >
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-6">Customize your video style</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2">Avatar Type</label>
                  <select
                    value={avatarType}
                    onChange={(e) => setAvatarType(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="energetic">Energetic</option>
                    <option value="friendly">Friendly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Script Tone</label>
                  <select
                    value={scriptTone}
                    onChange={(e) => setScriptTone(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
                  >
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="humorous">Humorous</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="font-medium text-gray-300 mb-3">Preview Style</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-black p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 rounded-full bg-tiktok-pink flex items-center justify-center text-white font-bold">
                        {avatarType.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">Avatar Type</p>
                        <p className="text-sm text-gray-400">{avatarType}</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">Sample appearance:</p>
                    <div className="h-40 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
                      <p className="text-center text-gray-400 px-4">
                        {avatarType === 'professional' && 'Polished, clean look with formal attire'}
                        {avatarType === 'casual' && 'Relaxed, friendly look with casual clothing'}
                        {avatarType === 'energetic' && 'Dynamic, vibrant presence with bold style'}
                        {avatarType === 'friendly' && 'Warm, approachable look with smiling expression'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-black p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center mb-4">
                      <div className="h-10 w-10 rounded-full bg-tiktok-blue flex items-center justify-center text-white font-bold">
                        {scriptTone.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">Script Tone</p>
                        <p className="text-sm text-gray-400">{scriptTone}</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">Sample script:</p>
                    <div className="h-40 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-3 overflow-auto">
                      <p className="text-sm text-gray-300">
                        {scriptTone === 'enthusiastic' && `Check out this AMAZING ${productName || 'product'}! I'm absolutely obsessed with how it changed my life. You NEED to try this right now!`}
                        {scriptTone === 'professional' && `Introducing the innovative ${productName || 'product'}, designed to deliver exceptional performance and reliability. Our research shows it outperforms competitors by 30%.`}
                        {scriptTone === 'casual' && `Hey! So I've been using this ${productName || 'product'} lately and it's honestly so good. I think you'd really like it too. Let me show you how it works...`}
                        {scriptTone === 'humorous' && `Okay so my life was a DISASTER before I found this ${productName || 'product'}. *dramatic pause* Just kidding! But seriously, it's pretty awesome and here's why...`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between mt-8">
                <button
                  onClick={handlePrevStep}
                  className="px-6 py-3 border border-gray-600 rounded-full text-white hover:bg-gray-800 transition-colors flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="px-6 py-3 bg-tiktok-pink rounded-full text-white hover:bg-opacity-90 transition-colors flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      Generate Video
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold mb-6">Your video is ready!</h2>
              
              {error ? (
                <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-300 px-6 py-4 rounded-lg mb-6">
                  <p className="font-medium mb-2">Error generating video</p>
                  <p className="text-sm">{error}</p>
                  <button
                    onClick={handlePrevStep}
                    className="mt-4 px-4 py-2 bg-red-500 rounded-lg text-white hover:bg-red-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : generatedVideo ? (
                <div>
                  <div className="relative aspect-[9/16] max-w-md mx-auto mb-6 bg-black rounded-2xl overflow-hidden">
                    <video 
                      src={generatedVideo.videoUrl}
                      controls
                      poster={generatedVideo.thumbnailUrl}
                      className="absolute inset-0 w-full h-full object-contain"
                    ></video>
                    <div className="absolute bottom-4 right-4 z-10">
                      <div className="flex space-x-2">
                        <button className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                          </svg>
                        </button>
                        <button className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-300 mb-2">Generated Script</h3>
                    <div className="bg-black p-4 rounded-lg border border-gray-800">
                      <p className="text-gray-300">{generatedVideo.script}</p>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="font-medium text-gray-300 mb-2">Video Details</h3>
                    <div className="bg-black p-4 rounded-lg border border-gray-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 text-sm">Title</p>
                          <p className="text-white">{generatedVideo.title}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Created</p>
                          <p className="text-white">{new Date(generatedVideo.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Avatar Type</p>
                          <p className="text-white capitalize">{avatarType}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Script Tone</p>
                          <p className="text-white capitalize">{scriptTone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-6 py-3 border border-gray-600 rounded-full text-white hover:bg-gray-800 transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Back to Dashboard
                    </button>
                    <button
                      onClick={() => {
                        setStep(1);
                        setProductName('');
                        setProductImage(null);
                        setImagePreview(null);
                        setGeneratedVideo(null);
                      }}
                      className="px-6 py-3 bg-tiktok-pink rounded-full text-white hover:bg-opacity-90 transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Create Another Video
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="animate-spin h-16 w-16 border-t-4 border-tiktok-pink rounded-full mx-auto mb-6"></div>
                  <p className="text-xl text-gray-300">Processing your video...</p>
                  <p className="text-gray-500 mt-2">This may take a minute or two.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoGenerator;