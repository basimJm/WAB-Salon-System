const cloudinary = require('cloudinary').v2;

let isConfigured = false;

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    isConfigured = true;
  } else {
    console.warn('Cloudinary not configured — image upload will be skipped');
  }
};

const uploadToCloudinary = async (filePath, folder) => {
  if (!isConfigured) return null;
  const result = await cloudinary.uploader.upload(filePath, { folder });
  return result.secure_url;
};

module.exports = { configureCloudinary, uploadToCloudinary };
