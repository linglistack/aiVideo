import React, { useState } from 'react';
import { transcribeVideo } from '../../services/videoService';

const VideoTranscriber = () => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [urlType, setUrlType] = useState('youtube'); // youtube, tiktok, instagram, direct
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleInputChange = (e) => {
    setVideoUrl(e.target.value);
    setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setError('');
    }
  };

  const uploadVideo = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Create FormData and append the file
      const formData = new FormData();
      formData.append('video', uploadedFile);
      
      // Upload to server or cloud storage
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user')).token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload video');
      }
      
      // Return the URL of the uploaded video
      return data.videoUrl;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  };

  const handleTranscribe = async () => {
    try {
      setIsLoading(true);
      setError('');
      setResult(null);
      
      let urlToTranscribe = videoUrl;
      
      // If a file was uploaded, get the URL after upload
      if (urlType === 'upload' && uploadedFile) {
        try {
          urlToTranscribe = await uploadVideo();
        } catch (error) {
          throw new Error('Failed to upload video. Please try again.');
        }
      }
      
      // Validate the URL
      if (!urlToTranscribe) {
        throw new Error('Please enter a video URL or upload a video file');
      }
      
      // Validate YouTube URL format
      if (urlType === 'youtube' && !urlToTranscribe.match(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/)) {
        throw new Error('Please enter a valid YouTube URL');
      }
      
      // Validate TikTok URL format
      if (urlType === 'tiktok' && !urlToTranscribe.match(/^(https?:\/\/)?(www\.)?(tiktok\.com)\/.+$/)) {
        throw new Error('Please enter a valid TikTok URL');
      }
      
      // Validate Instagram URL format
      if (urlType === 'instagram' && !urlToTranscribe.match(/^(https?:\/\/)?(www\.)?(instagram\.com)\/.+$/)) {
        throw new Error('Please enter a valid Instagram URL');
      }
      
      // Make the API call
      const response = await transcribeVideo(urlToTranscribe);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to transcribe video');
      }
      
      setResult(response.data);
    } catch (error) {
      console.error('Error transcribing video:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-white">Video Transcriber & Summarizer</h1>
      
      <div className="bg-tiktok-dark rounded-lg p-6 mb-8 shadow-lg border border-gray-800">
        <div className="mb-6">
          <label className="block text-gray-300 mb-2 font-medium">Video Source</label>
          <div className="flex flex-wrap gap-3">
            <button 
              className={`px-4 py-2 rounded-md ${urlType === 'youtube' ? 'bg-tiktok-pink text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setUrlType('youtube')}
            >
              YouTube
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${urlType === 'tiktok' ? 'bg-tiktok-pink text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setUrlType('tiktok')}
            >
              TikTok
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${urlType === 'instagram' ? 'bg-tiktok-pink text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setUrlType('instagram')}
            >
              Instagram
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${urlType === 'direct' ? 'bg-tiktok-pink text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setUrlType('direct')}
            >
              Direct URL
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${urlType === 'upload' ? 'bg-tiktok-pink text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setUrlType('upload')}
            >
              Upload File
            </button>
          </div>
        </div>
        
        {urlType === 'upload' ? (
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 font-medium">Upload Video File</label>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white 
                        placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
            />
            {uploadedFile && (
              <p className="mt-2 text-sm text-gray-400">
                Selected: {uploadedFile.name} ({Math.round(uploadedFile.size / 1024 / 1024 * 10) / 10} MB)
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-gray-300 mb-2 font-medium">
              {urlType === 'youtube' ? 'YouTube Video URL' : 
               urlType === 'tiktok' ? 'TikTok Video URL' : 
               urlType === 'instagram' ? 'Instagram Video URL' : 'Direct Video URL'}
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={handleInputChange}
              placeholder={
                urlType === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 
                urlType === 'tiktok' ? 'https://www.tiktok.com/@username/video/...' : 
                urlType === 'instagram' ? 'https://www.instagram.com/p/...' : 
                'https://example.com/video.mp4'
              }
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white 
                        placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tiktok-pink"
            />
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-300">
            {error}
          </div>
        )}
        
        <button
          onClick={handleTranscribe}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-medium transition-all
                    ${isLoading 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-tiktok-blue to-tiktok-pink text-white hover:from-tiktok-blue/90 hover:to-tiktok-pink/90 hover:shadow-lg'
                    }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
              <span>Processing...</span>
            </div>
          ) : (
            'Transcribe & Summarize'
          )}
        </button>
      </div>
      
      {result && (
        <div className="bg-tiktok-dark rounded-lg p-6 shadow-lg border border-gray-800">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Transcript</h2>
            <div className="bg-black/50 p-4 rounded-lg text-gray-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {result.transcription}
            </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-4 text-white">Summary</h2>
            <div className="bg-black/50 p-4 rounded-lg text-gray-200 whitespace-pre-wrap">
              {result.summary}
            </div>
          </div>
          
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Transcript:\n${result.transcription}\n\nSummary:\n${result.summary}`);
              }}
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Copy All
            </button>
            
            <div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.transcription);
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors mr-3"
              >
                Copy Transcript
              </button>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.summary);
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Copy Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoTranscriber; 