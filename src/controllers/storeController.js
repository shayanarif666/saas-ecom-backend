const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const storeService = require('../services/storeService');

const getMyStore = asyncHandler(async (req, res) => {
  const store = await storeService.getMyStore(req.storeId);
  return successResponse(res, {
    message: 'Store profile fetched',
    data: { store },
  });
});

const updateMyStore = asyncHandler(async (req, res) => {
  const store = await storeService.updateMyStore(req.storeId, req.body);
  return successResponse(res, {
    message: 'Store profile updated',
    data: { store },
  });
});

module.exports = { getMyStore, updateMyStore };
