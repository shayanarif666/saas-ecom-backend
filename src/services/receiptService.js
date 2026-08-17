const mongoose = require('mongoose');
const Receipt = require('../models/Receipt');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Counter = require('../models/Counter');
const AppError = require('../utils/AppError');

const isObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) &&
  String(new mongoose.Types.ObjectId(value)) === String(value);

const findOrderForStore = async (storeId, orderRef) => {
  const filter = { storeId };
  if (isObjectId(orderRef)) {
    filter.$or = [{ _id: orderRef }, { orderNumber: orderRef }];
  } else {
    filter.orderNumber = orderRef;
  }

  const order = await Order.findOne(filter).populate(
    'customerId',
    'name email phone'
  );
  return order;
};

const buildTransactionId = (order) =>
  `TXN-${String(order.orderNumber || order._id).replace(/^ORD-/, '')}`;

const createReceiptFromOrder = async (order, store) => {
  const seq = await Counter.getNextSequence(`receipt:${store._id}`);
  const receiptNumber = `RCPT-${String(seq).padStart(6, '0')}`;

  try {
    return await Receipt.create({
      storeId: order.storeId,
      orderId: order._id,
      receiptNumber,
      customerId: order.customerId?._id || order.customerId || null,
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount || 0,
      taxAmount: order.taxAmount || 0,
      shippingFee: order.shippingFee || 0,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      issuedAt: order.placedAt || order.createdAt || new Date(),
      storeSnapshot: {
        name: store.name,
        address: store.address || '',
        contactPhone: store.contactPhone || '',
        contactEmail: store.contactEmail || '',
        logoUrl: store.logoUrl || '',
      },
    });
  } catch (err) {
    // Race: another request created the receipt — return existing
    if (err && err.code === 11000) {
      return Receipt.findOne({ orderId: order._id, storeId: order.storeId });
    }
    throw err;
  }
};

const ensureReceiptForOrder = async (order) => {
  let receipt = await Receipt.findOne({
    storeId: order.storeId,
    orderId: order._id,
  });
  if (receipt) return receipt;

  const store = await Store.findById(order.storeId).select(
    'name address contactPhone contactEmail logoUrl'
  );
  if (!store) throw new AppError('Store not found', 404);

  receipt = await createReceiptFromOrder(order, store);
  if (!receipt) throw new AppError('Unable to create receipt', 500);
  return receipt;
};

const serializeReceipt = (receipt, order) => {
  const base = receipt.toObject ? receipt.toObject() : { ...receipt };
  const customerName =
    order.shippingAddress?.name ||
    order.customerId?.name ||
    '—';
  const customerEmail =
    order.shippingAddress?.email || order.customerId?.email || '';
  const customerPhone =
    order.shippingAddress?.phone || order.customerId?.phone || '';

  return {
    ...base,
    transactionId: buildTransactionId(order),
    orderId: order._id,
    orderNumber: order.orderNumber,
    customer: customerName,
    customerEmail,
    customerPhone,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    statusHistory: order.statusHistory || [],
    shippingAddress: order.shippingAddress,
    refund: order.refund || null,
    items: base.items?.length ? base.items : order.items,
  };
};

/**
 * Resolve order by Mongo id or order number, ensure receipt exists, return enriched payload.
 */
const getReceiptByOrder = async (storeId, orderRef) => {
  const order = await findOrderForStore(storeId, orderRef);
  if (!order) throw new AppError('Order not found', 404);

  const receipt = await ensureReceiptForOrder(order);
  return serializeReceipt(receipt, order);
};

module.exports = {
  getReceiptByOrder,
  ensureReceiptForOrder,
  serializeReceipt,
  findOrderForStore,
  buildTransactionId,
  isObjectId,
};
