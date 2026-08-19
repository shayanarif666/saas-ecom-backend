const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const persistImageValue = async (value, { folder } = {}) => {
  if (value == null || value === '') return value;
  const str = String(value).trim();
  if (!str) return str;
  if (str.startsWith('data:image/')) {
    const result = await cloudinary.uploader.upload(str, {
      folder: folder || 'bookstore',
      resource_type: 'image',
    });
    return result.secure_url || result.url;
  }
  return str;
};

const persistImageList = async (urls, options) => {
  if (!Array.isArray(urls)) return urls;
  return Promise.all(urls.map((url) => persistImageValue(url, options)));
};

module.exports = {
  persistImageValue,
  persistImageList,
};
