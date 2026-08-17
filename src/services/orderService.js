const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const receiptService = require('./receiptService');
const orderEmailService = require('./orderEmailService');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta } = require('../utils/pagination');

const ALLOWED_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  total_desc: { totalAmount: -1 },
  total_asc: { totalAmount: 1 },
};

const restockOrderItems = async (order, storeId) => {
  for (const item of order.items) {
    if (!item.productId) continue;
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne({ _id: item.productId, storeId }, [
      {
        $set: {
          stockQuantity: { $add: ['$stockQuantity', item.quantity] },
          soldCount: {
            $max: [{ $subtract: ['$soldCount', item.quantity] }, 0],
          },
        },
      },
    ]);
  }
};

const listOrders = async (storeId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { storeId };

  if (query.orderStatus) filter.orderStatus = query.orderStatus;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  if (query.search) {
    const re = { $regex: query.search, $options: 'i' };
    filter.$or = [
      { orderNumber: re },
      { 'shippingAddress.name': re },
      { 'shippingAddress.phone': re },
      { 'shippingAddress.email': re },
    ];
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort(SORT_MAP[query.sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name email phone')
      .select('-statusHistory'),
    Order.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
};

const getOrderById = async (storeId, id) => {
  let order = null;

  if (receiptService.isObjectId(id)) {
    order = await Order.findOne({ _id: id, storeId })
      .populate('customerId', 'name email phone')
      .populate('statusHistory.changedBy', 'name email');
  }

  if (!order) {
    order = await Order.findOne({ storeId, orderNumber: id })
      .populate('customerId', 'name email phone')
      .populate('statusHistory.changedBy', 'name email');
  }

  if (!order) throw new AppError('Order not found', 404);
  return order;
};

const findOrderDocument = async (storeId, id) => {
  if (receiptService.isObjectId(id)) {
    const byId = await Order.findOne({ _id: id, storeId });
    if (byId) return byId;
  }
  const byNumber = await Order.findOne({ storeId, orderNumber: id });
  if (!byNumber) throw new AppError('Order not found', 404);
  return byNumber;
};

const updateOrderStatus = async (storeId, id, payload, changedBy) => {
  const order = await findOrderDocument(storeId, id);

  const current = order.orderStatus;
  const next = payload.orderStatus;

  if (current === next) {
    throw new AppError('Order is already in this status', 400);
  }

  const allowed = ALLOWED_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new AppError(
      `Cannot transition from "${current}" to "${next}"`,
      400
    );
  }

  order.orderStatus = next;
  order.statusHistory.push({
    status: next,
    note: payload.note || undefined,
    location: payload.location || undefined,
    changedAt: new Date(),
    changedBy,
    isCustomerVisible: true,
  });

  if (next === 'shipped' || next === 'out_for_delivery') {
    if (!order.shipping) order.shipping = {};
    if (payload.trackingNumber) order.shipping.trackingNumber = payload.trackingNumber;
    if (payload.carrier) order.shipping.carrier = payload.carrier;
    if (payload.trackingUrl) order.shipping.trackingUrl = payload.trackingUrl;
    if (!order.shipping.shippedAt) order.shipping.shippedAt = new Date();
  }

  if (next === 'delivered') {
    if (!order.shipping) order.shipping = {};
    order.shipping.deliveredAt = new Date();
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'paid';
    }
    if (order.paymentStatus === 'paid') {
      await receiptService.ensureReceiptForOrder(order);
    }
  }

  if (next === 'cancelled') {
    order.cancelledAt = new Date();
    order.cancelReason = payload.note || 'Cancelled by administrator';
    await restockOrderItems(order, storeId);
  }

  await order.save();

  try {
    const store = await Store.findById(storeId).select('name contactEmail');
    await orderEmailService.sendOrderStatusEmail({
      order,
      store,
      previousStatus: current,
    });
  } catch (err) {
    console.error('[updateOrderStatus:email]', err?.message || err);
  }

  return order;
};

const refundOrder = async (storeId, id, { amount, reason }, refundedBy) => {
  const order = await findOrderDocument(storeId, id);

  if (order.paymentStatus === 'refunded') {
    throw new AppError('Order is already refunded', 400);
  }

  if (!['paid', 'pending'].includes(order.paymentStatus)) {
    throw new AppError('Only paid or pending orders can be refunded', 400);
  }

  if (amount <= 0) {
    throw new AppError('Refund amount must be greater than zero', 400);
  }

  if (amount > order.totalAmount) {
    throw new AppError('Refund amount cannot exceed order total', 400);
  }

  const wasCancelled = order.orderStatus === 'cancelled';
  const shouldCancel =
    order.orderStatus !== 'cancelled' && order.orderStatus !== 'delivered';

  order.paymentStatus = 'refunded';
  order.refund = {
    amount,
    reason,
    refundedAt: new Date(),
    refundedBy,
  };

  if (shouldCancel) {
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason;
    order.statusHistory.push({
      status: 'cancelled',
      note: `Refunded: ${reason}`,
      changedAt: new Date(),
      changedBy: refundedBy,
      isCustomerVisible: true,
    });
    if (!wasCancelled) {
      await restockOrderItems(order, storeId);
    }
  } else if (order.orderStatus === 'delivered') {
    order.statusHistory.push({
      status: 'delivered',
      note: `Refund issued: ${reason}`,
      changedAt: new Date(),
      changedBy: refundedBy,
      isCustomerVisible: true,
    });
    await restockOrderItems(order, storeId);
  }

  await order.save();
  await receiptService.ensureReceiptForOrder(order);
  return order;
};

const updatePaymentStatus = async (storeId, id, paymentStatus, changedBy) => {
  const order = await findOrderDocument(storeId, id);
  const next = String(paymentStatus || '').toLowerCase();

  if (!['pending', 'paid', 'failed'].includes(next)) {
    throw new AppError('Payment status must be pending, paid, or failed', 400);
  }

  if (order.paymentStatus === 'refunded') {
    throw new AppError('Refunded orders cannot change payment status here', 400);
  }

  if (order.paymentStatus === next) {
    throw new AppError('Payment is already in this status', 400);
  }

  const previous = order.paymentStatus;
  order.paymentStatus = next;
  order.statusHistory.push({
    status: order.orderStatus,
    note: `Payment status: ${previous} → ${next}`,
    changedAt: new Date(),
    changedBy,
    isCustomerVisible: true,
  });

  if (next === 'paid') {
    await receiptService.ensureReceiptForOrder(order);
  }

  await order.save();
  return order;
};

module.exports = {
  listOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  refundOrder,
  ALLOWED_TRANSITIONS,
};
