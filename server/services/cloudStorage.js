const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

// Initialize Cloudinary with error handling
try {
  // Check if environment variables are set
  if (!process.env.CLOUDINARY_CLOUD_NAME || 
      !process.env.CLOUDINARY_API_KEY || 
      !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary environment variables are missing');
  } else {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    console.log('Cloudinary configured successfully');
  }
} catch (error) {
  console.error('Cloudinary configuration error:', error);
}

/**
 * Upload a file to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer
 * @param {Object} options - Upload options (folder, public_id, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadFile = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Validate configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return reject(new Error('Cloudinary is not properly configured'));
    }
    
    // Set default options
    const uploadOptions = {
      folder: options.folder || 'aivideo',
      resource_type: options.resource_type || 'auto',
      ...options
    };

    // Upload stream from buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    // Convert buffer to stream and pipe to uploadStream
    try {
      const Readable = require('stream').Readable;
      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file
 * @returns {Promise<Object>} Cloudinary delete result
 */
const deleteFile = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

/**
 * Get the URL for a file
 * @param {string} publicId - The public ID of the file 
 * @param {Object} options - Transform options
 * @returns {string} The URL of the file
 */
const getFileUrl = (publicId, options = {}) => {
  try {
    return cloudinary.url(publicId, options);
  } catch (error) {
    console.error('Error generating Cloudinary URL:', error);
    return '';
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  getFileUrl
}; 