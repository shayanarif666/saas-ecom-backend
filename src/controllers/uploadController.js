const fs = require('fs/promises');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const unlinkQuiet = async (path) => {
  if (!path) return;
  try {
    await fs.unlink(path);
  } catch {
    // temp file already gone
  }
};

const toImagePayload = (result) => ({
  url: result.secure_url || result.url,
  publicId: result.public_id,
  width: result.width,
  height: result.height,
  format: result.format,
  bytes: result.bytes,
  provider: 'cloudinary',
});

const cloudinaryUploadError = (err) => {
  const httpCode = err?.http_code || err?.error?.http_code;
  const detail = err?.error?.message || err?.message || 'Cloudinary upload failed';

  if (httpCode === 403) {
    return new AppError(
      'Cloudinary rejected the upload (403). This API key can ping the account but cannot create assets. In Cloudinary go to Settings → API Keys, open this key, and enable Asset permissions: Upload / Create (or create a new full-access key). Then update CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Backend/.env and restart the server.',
      502
    );
  }

  return new AppError(detail, 502);
};

const uploadFileToCloudinary = async (file, folder) => {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: folder || 'bookstore',
    resource_type: 'image',
  });
  await unlinkQuiet(file.path);
  return toImagePayload(result);
};

const upload = asyncHandler(async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) {
    throw new AppError('No image files provided (use field name "images")', 400);
  }

  const folder = req.body?.folder || 'bookstore';
  const images = [];

  try {
    for (const file of files) {
      images.push(await uploadFileToCloudinary(file, folder));
    }
  } catch (err) {
    await Promise.all(files.map((file) => unlinkQuiet(file.path)));
    if (err instanceof AppError) throw err;
    throw cloudinaryUploadError(err);
  }

  return successResponse(res, {
    statusCode: 201,
    message: 'Upload complete',
    data: { images },
  });
});

module.exports = { upload };
