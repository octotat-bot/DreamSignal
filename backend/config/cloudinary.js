/**
 * Cloudinary SDK configuration.
 *
 * Reads credentials from environment variables. The configured instance
 * is shared across the app — import `cloudinary` and `uploadToCloudinary`
 * from this module wherever uploads or deletions are needed.
 */
const cloudinary = require('cloudinary').v2;
const rootLogger = require('../services/logger').child({ scope: 'cloudinary' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET,
});

/**
 * Upload a buffer or file path to Cloudinary.
 *
 * @param {Buffer|string} source  - File path or buffer to upload
 * @param {object}        options - Cloudinary upload options (folder, public_id, etc.)
 * @returns {Promise<object>}     - Cloudinary upload result
 */
const uploadToCloudinary = (source, options = {}) => {
  return new Promise((resolve, reject) => {
    const callback = (error, result) => {
      if (error) {
        rootLogger.error({ err: error.message }, 'Cloudinary upload failed');
        return reject(error);
      }
      resolve(result);
    };

    if (Buffer.isBuffer(source)) {
      const stream = cloudinary.uploader.upload_stream(options, callback);
      stream.end(source);
    } else {
      cloudinary.uploader.upload(source, options, callback);
    }
  });
};

/**
 * Delete a resource from Cloudinary by public_id.
 *
 * @param {string} publicId - The public_id of the resource to destroy
 * @returns {Promise<object>}
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    rootLogger.debug({ publicId, result: result.result }, 'Cloudinary resource deleted');
    return result;
  } catch (error) {
    rootLogger.error({ publicId, err: error.message }, 'Cloudinary deletion failed');
    throw error;
  }
};

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary };
