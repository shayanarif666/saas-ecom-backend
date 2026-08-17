const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const analyticsService = require('../services/analyticsService');

const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await analyticsService.getAnalytics(req.storeId, req.query);
  return successResponse(res, {
    message: 'Dashboard analytics fetched',
    data: analytics,
  });
});

module.exports = { getAnalytics };
