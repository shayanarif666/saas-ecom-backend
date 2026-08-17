const { v2: cloudinary } = require('cloudinary');
const { cloudinary: cfg } = require('./env');

if (cfg.cloudName && cfg.apiKey && cfg.apiSecret) {
  cloudinary.config({
    cloud_name: cfg.cloudName,
    api_key: cfg.apiKey,
    api_secret: cfg.apiSecret,
  });
}

module.exports = cloudinary;
