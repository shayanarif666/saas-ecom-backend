const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const receiptService = require('../services/receiptService');

const getByOrder = asyncHandler(async (req, res) => {
  const receipt = await receiptService.getReceiptByOrder(
    req.storeId,
    req.params.orderId
  );
  return successResponse(res, {
    message: 'Receipt fetched',
    data: { receipt },
  });
});

module.exports = { getByOrder };
