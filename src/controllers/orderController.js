const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const orderService = require('../services/orderService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await orderService.listOrders(req.storeId, req.query);
  return successResponse(res, {
    message: 'Orders fetched',
    data: { orders: items },
    meta,
  });
});

const getById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.storeId, req.params.id);
  return successResponse(res, {
    message: 'Order fetched',
    data: { order },
  });
});

const updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.storeId,
    req.params.id,
    req.body,
    req.user.id
  );
  return successResponse(res, {
    message: 'Order status updated',
    data: { order },
  });
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(
    req.storeId,
    req.params.id,
    req.body.paymentStatus,
    req.user.id
  );
  return successResponse(res, {
    message: 'Payment status updated',
    data: { order },
  });
});

const refund = asyncHandler(async (req, res) => {
  const order = await orderService.refundOrder(
    req.storeId,
    req.params.id,
    req.body,
    req.user.id
  );
  return successResponse(res, {
    message: 'Order refunded',
    data: { order },
  });
});

module.exports = { list, getById, updateStatus, updatePaymentStatus, refund };
