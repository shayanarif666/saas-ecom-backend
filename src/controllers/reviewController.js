const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const reviewService = require('../services/reviewService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await reviewService.listReviews(req.storeId, req.query);
  return successResponse(res, {
    message: 'Reviews fetched',
    data: { reviews: items },
    meta,
  });
});

const getById = asyncHandler(async (req, res) => {
  const review = await reviewService.getReviewById(req.storeId, req.params.id);
  return successResponse(res, {
    message: 'Review fetched',
    data: { review },
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const review = await reviewService.updateReviewStatus(
    req.storeId,
    req.params.id,
    req.body.status
  );
  return successResponse(res, {
    message: 'Review status updated',
    data: { review },
  });
});

const remove = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.storeId, req.params.id);
  return successResponse(res, {
    message: 'Review deleted',
    data: null,
  });
});

module.exports = { list, getById, updateStatus, remove };
