const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer
 * @param {Object} options - Upload options (folder, public_id, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadFile = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
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
    const Readable = require('stream').Readable;
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file
 * @returns {Promise<Object>} Cloudinary delete result
 */
const deleteFile = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

/**
 * Get the URL for a file
 * @param {string} publicId - The public ID of the file 
 * @param {Object} options - Transform options
 * @returns {string} The URL of the file
 */
const getFileUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, options);
};

module.exports = {
  uploadFile,
  deleteFile,
  getFileUrl
}; 