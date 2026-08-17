const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const uploadService = require('../services/uploadService');
const AppError = require('../utils/AppError');

const upload = asyncHandler(async (req, res) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) {
    throw new AppError('No image files provided (use field name "images")', 400);
  }

  const uploads = await uploadService.uploadImages(files, {
    folder: req.body?.folder || `bookstore/store-${req.storeId}`,
  });

  return successResponse(res, {
    statusCode: 201,
    message: 'Upload complete',
    data: {
      images: uploads,
      provider: uploads[0]?.provider,
    },
  });
});

module.exports = { upload };
