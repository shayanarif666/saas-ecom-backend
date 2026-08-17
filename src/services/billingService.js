const mongoose = require('mongoose');
const Order = require('../models/Order');
const receiptService = require('./receiptService');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta } = require('../utils/pagination');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const resolveRange = (query) => {
  const now = new Date();
  let from;
  let to = query.to ? new Date(query.to) : now;

  if (query.from) {
    from = new Date(query.from);
  } else {
    from = new Date(now);
    from.setDate(from.getDate() - (query.days || 30));
    from.setHours(0, 0, 0, 0);
  }

  return { from, to };
};

const mapOrderToTransaction = (order) => {
  const plain = order.toObject ? order.toObject() : order;
  const amount =
    plain.paymentStatus === 'refunded'
      ? -(plain.refund?.amount ?? plain.totalAmount)
      : plain.totalAmount;

  return {
    _id: `txn-${plain._id}`,
    transactionId: receiptService.buildTransactionId(plain),
    orderId: plain._id,
    orderNumber: plain.orderNumber,
    date: plain.createdAt || plain.placedAt,
    amount,
    paymentMethod: plain.paymentMethod,
    paymentType: plain.paymentMethod,
    status: plain.paymentStatus,
    customer:
      plain.shippingAddress?.name ||
      plain.customerId?.name ||
      '—',
    order: plain,
  };
};

const getBillingSummary = async (storeId, query) => {
  const { from, to } = resolveRange(query);
  const storeObjectId = toObjectId(storeId);

  const [byMethod, totals] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          createdAt: { $gte: from, $lte: to },
          paymentStatus: { $in: ['paid', 'refunded', 'pending'] },
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          paidRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
            },
          },
          pendingRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0],
            },
          },
          refundedAmount: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'refunded'] },
                { $ifNull: ['$refund.amount', '$totalAmount'] },
                0,
              ],
            },
          },
          paidOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] },
          },
          refundedOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, 1, 0] },
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          paymentMethod: '$_id',
          paidRevenue: 1,
          pendingRevenue: 1,
          refundedAmount: 1,
          paidOrders: 1,
          refundedOrders: 1,
          pendingOrders: 1,
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          grossRevenue: {
            $sum: {
              $cond: [
                { $in: ['$paymentStatus', ['paid', 'pending']] },
                '$totalAmount',
                0,
              ],
            },
          },
          paidRevenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
            },
          },
          totalRefunds: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'refunded'] },
                { $ifNull: ['$refund.amount', 0] },
                0,
              ],
            },
          },
          orderCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const t = totals[0] || {
    grossRevenue: 0,
    paidRevenue: 0,
    totalRefunds: 0,
    orderCount: 0,
  };

  return {
    period: { from, to },
    totals: {
      grossRevenue: t.grossRevenue,
      paidRevenue: t.paidRevenue,
      totalRefunds: t.totalRefunds,
      netRevenue: t.grossRevenue - t.totalRefunds,
      orderCount: t.orderCount,
    },
    byPaymentMethod: byMethod,
  };
};

const listRefunds = async (storeId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = {
    storeId,
    paymentStatus: 'refunded',
    refund: { $exists: true },
  };

  if (query.from || query.to) {
    filter['refund.refundedAt'] = {};
    if (query.from) filter['refund.refundedAt'].$gte = new Date(query.from);
    if (query.to) filter['refund.refundedAt'].$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ 'refund.refundedAt': -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name email')
      .populate('refund.refundedBy', 'name email')
      .select(
        'orderNumber totalAmount paymentMethod paymentStatus refund shippingAddress.name createdAt'
      ),
    Order.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
};

const listTransactions = async (storeId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { storeId };

  if (query.status) filter.paymentStatus = query.status;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;

  if (query.from || query.to || query.days) {
    const { from, to } = resolveRange(query);
    filter.createdAt = { $gte: from, $lte: to };
  }

  if (query.search) {
    const re = { $regex: query.search, $options: 'i' };
    filter.$or = [
      { orderNumber: re },
      { 'shippingAddress.name': re },
      { 'shippingAddress.email': re },
    ];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name email phone'),
    Order.countDocuments(filter),
  ]);

  return {
    items: orders.map(mapOrderToTransaction),
    meta: buildMeta({ page, limit, total }),
  };
};

const getTransaction = async (storeId, id) => {
  let order = null;

  // Accept: Mongo order id, orderNumber, txn-<orderId>, TXN-<suffix>
  if (typeof id === 'string' && id.startsWith('txn-')) {
    const orderId = id.slice(4);
    if (receiptService.isObjectId(orderId)) {
      order = await Order.findOne({ _id: orderId, storeId }).populate(
        'customerId',
        'name email phone'
      );
    }
  }

  if (!order) {
    order = await receiptService.findOrderForStore(storeId, id);
  }

  if (!order && typeof id === 'string' && id.startsWith('TXN-')) {
    const suffix = id.slice(4);
    order = await Order.findOne({
      storeId,
      $or: [
        { orderNumber: `ORD-${suffix}` },
        { orderNumber: suffix },
        { orderNumber: id },
      ],
    }).populate('customerId', 'name email phone');
  }

  if (!order) throw new AppError('Transaction not found', 404);

  const txn = mapOrderToTransaction(order);
  const receiptDoc = await receiptService.ensureReceiptForOrder(order);
  const receipt = receiptService.serializeReceipt(receiptDoc, order);

  return { ...txn, receipt };
};

module.exports = {
  getBillingSummary,
  listRefunds,
  listTransactions,
  getTransaction,
  mapOrderToTransaction,
};
