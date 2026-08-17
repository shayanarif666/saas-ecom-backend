const { Readable } = require('stream');
const crypto = require('crypto');
const cloudinary = require('../config/cloudinary');
const { cloudinary: cfg } = require('../config/env');
const AppError = require('../utils/AppError');
const { saveBufferLocally } = require('../utils/localUploads');

const isCloudinaryConfigured = () => {
  if (!cfg.cloudName || !cfg.apiKey || !cfg.apiSecret) return false;
  // Treat obvious placeholders as unconfigured → use data-URL fallback
  const fake =
    /fake|change_me|your_|xxx|123456789012345/i.test(String(cfg.cloudName)) ||
    /fake|change_me|your_/i.test(String(cfg.apiSecret));
  return !fake;
};

/**
 * Cloudinary public_id cannot contain spaces / parentheses — they break signature.
 * e.g. "featured-picks (1).jpg" → "featured-picks-1"
 */
const sanitizePublicId = (originalName) => {
  const withoutExt = String(originalName || 'image').replace(/\.[^.]+$/, '');
  const cleaned = withoutExt
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80);
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${cleaned || 'image'}-${suffix}`;
};

const uploadBufferToCloudinary = (buffer, { folder, filename }) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || 'bookstore',
        public_id: sanitizePublicId(filename),
        resource_type: 'image',
        overwrite: false,
        unique_filename: false,
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });

const uploadImages = async (files, { folder } = {}) => {
  if (!files || !files.length) {
    throw new AppError('No files uploaded', 400);
  }

  if (isCloudinaryConfigured()) {
    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          const result = await uploadBufferToCloudinary(file.buffer, {
            folder: folder || 'bookstore/uploads',
            filename: file.originalname,
          });
          return {
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            provider: 'cloudinary',
          };
        })
      );
      return uploads;
    } catch (err) {
      throw new AppError(
        err.message || 'Cloudinary upload failed. Check API credentials and file name.',
        502
      );
    }
  }

  // Dev fallback: store files under /uploads (never persist multi-MB data URLs in Mongo)
  return files.map((file) => {
    const url = saveBufferLocally({
      buffer: file.buffer,
      mime: file.mimetype,
      filename: file.originalname,
    });
    return {
      url,
      publicId: null,
      width: null,
      height: null,
      format: file.mimetype.split('/')[1],
      bytes: file.size,
      provider: 'local',
    };
  });
};

module.exports = { uploadImages, isCloudinaryConfigured, sanitizePublicId };
