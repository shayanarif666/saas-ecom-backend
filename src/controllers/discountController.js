const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const discountService = require('../services/discountService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await discountService.listDiscounts(
    req.storeId,
    req.query
  );
  return successResponse(res, {
    message: 'Discounts fetched',
    data: { discounts: items },
    meta,
  });
});

const getById = asyncHandler(async (req, res) => {
  const discount = await discountService.getDiscountById(
    req.storeId,
    req.params.id
  );
  return successResponse(res, {
    message: 'Discount fetched',
    data: { discount },
  });
});

const create = asyncHandler(async (req, res) => {
  const discount = await discountService.createDiscount(req.storeId, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Discount created',
    data: { discount },
  });
});

const validateCode = asyncHandler(async (req, res) => {
  const result = await discountService.validateDiscountCode(
    req.storeId,
    req.body.code || req.body.couponCode,
    Number(req.body.orderSubtotal ?? req.body.subtotal) || 0
  );
  return successResponse(res, {
    message: 'Discount is valid',
    data: {
      discount: result.discount,
      discountAmount: result.discountAmount,
      label: result.label,
      message: result.message,
      code: result.discount.code,
      type: result.discount.type,
      value: result.discount.value,
    },
  });
});

const update = asyncHandler(async (req, res) => {
  const discount = await discountService.updateDiscount(
    req.storeId,
    req.params.id,
    req.body
  );
  return successResponse(res, {
    message: 'Discount updated',
    data: { discount },
  });
});

const remove = asyncHandler(async (req, res) => {
  await discountService.deleteDiscount(req.storeId, req.params.id);
  return successResponse(res, {
    message: 'Discount deleted',
    data: null,
  });
});

module.exports = { list, getById, create, validateCode, update, remove };
