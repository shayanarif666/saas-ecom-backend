const Order = require('../models/Order');
const Product = require('../models/Product');
const Store = require('../models/Store');
const StoreCustomer = require('../models/StoreCustomer');
const Counter = require('../models/Counter');
const cartService = require('./cartService');
const discountService = require('./discountService');
const receiptService = require('./receiptService');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta } = require('../utils/pagination');

const nextOrderNumber = async (storeId) => {
  const seq = await Counter.getNextSequence(`order:${storeId}`);
  return `ORD-${String(seq).padStart(6, '0')}`;
};

const calcShippingFee = (store, subtotalAfterDiscount) => {
  const flat = Number(store.shipping?.flatFee) || 0;
  const freeOver = store.shipping?.freeOverAmount;
  if (freeOver != null && subtotalAfterDiscount >= Number(freeOver)) return 0;
  return flat;
};

/**
 * Place a customer order for a store. Always stamps storeId + customerId.
 */
const placeOrder = async (storeId, userId, payload) => {
  const store = await Store.findById(storeId);
  if (!store || !store.isActive) throw new AppError('Store not found', 404);
  if (!store.isLive) throw new AppError('This store is not accepting orders yet', 403);

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (!rawItems.length) throw new AppError('Cart is empty', 400);

  const shippingAddress = payload.shippingAddress;
  if (
    !shippingAddress?.name ||
    !shippingAddress?.phone ||
    !shippingAddress?.email ||
    !shippingAddress?.addressLine ||
    !shippingAddress?.city ||
    !shippingAddress?.postalCode
  ) {
    throw new AppError('Complete shipping address is required', 400);
  }

  const paymentMethod = payload.paymentMethod || 'cod';
  if (!['cod', 'jazzcash', 'easypaisa'].includes(paymentMethod)) {
    throw new AppError('Invalid payment method', 400);
  }

  const orderItems = [];
  let subtotal = 0;

  for (const line of rawItems) {
    const qty = Number(line.quantity) || 0;
    if (qty < 1) continue;

    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findOne({
      _id: line.productId,
      storeId,
      isPublished: true,
    });
    if (!product) {
      throw new AppError('One or more products are unavailable', 400);
    }
    if (product.stockQuantity < qty) {
      throw new AppError(`Insufficient stock for "${product.title}"`, 400);
    }

    const unitPrice = cartService.effectivePrice(product);
    const lineSubtotal = Number((unitPrice * qty).toFixed(2));
    subtotal += lineSubtotal;

    orderItems.push({
      productId: product._id,
      title: product.title,
      sku: product.sku,
      imageUrl: product.images?.[0],
      unitPrice,
      quantity: qty,
      subtotal: lineSubtotal,
    });
  }

  if (!orderItems.length) throw new AppError('Cart is empty', 400);
  subtotal = Number(subtotal.toFixed(2));

  let discountAmount = 0;
  let couponCode;
  let appliedDiscountId = null;
  if (payload.couponCode) {
    const validated = await discountService.validateDiscountCode(
      storeId,
      payload.couponCode,
      subtotal
    );
    discountAmount = validated.discountAmount;
    couponCode = validated.discount.code;
    appliedDiscountId = validated.discount._id;
  }

  const shippingFee = calcShippingFee(store, subtotal - discountAmount);
  const taxAmount = 0;
  const totalAmount = Number(
    Math.max(0, subtotal - discountAmount + shippingFee + taxAmount).toFixed(2)
  );

  // Decrement stock
  for (const item of orderItems) {
    // eslint-disable-next-line no-await-in-loop
    const updated = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        storeId,
        stockQuantity: { $gte: item.quantity },
      },
      {
        $inc: { stockQuantity: -item.quantity, soldCount: item.quantity },
      },
      { new: true }
    );
    if (!updated) {
      throw new AppError(`Stock changed for "${item.title}". Please refresh cart.`, 409);
    }
  }

  const orderNumber = await nextOrderNumber(storeId);
  const order = await Order.create({
    storeId,
    orderNumber,
    customerId: userId,
    items: orderItems,
    shippingAddress: {
      name: shippingAddress.name,
      phone: shippingAddress.phone,
      email: String(shippingAddress.email).toLowerCase(),
      addressLine: shippingAddress.addressLine,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
    },
    subtotal,
    discountAmount,
    shippingFee,
    taxAmount,
    totalAmount,
    couponCode,
    paymentMethod,
    // All methods place immediately; gateway capture comes later for wallets.
    paymentStatus: 'pending',
    orderStatus: 'pending',
    customerNote: payload.customerNote || undefined,
  });

  if (appliedDiscountId) {
    await discountService.incrementDiscountUsage(appliedDiscountId);
  }

  await StoreCustomer.findOneAndUpdate(
    { storeId, userId },
    {
      $inc: { totalOrders: 1, totalSpent: totalAmount },
      $set: { lastOrderAt: new Date() },
      $setOnInsert: { firstOrderAt: new Date(), storeId, userId },
    },
    { upsert: true }
  );

  try {
    await receiptService.ensureReceiptForOrder(order);
  } catch {
    /* receipt optional at place-time */
  }

  await cartService.clearCart(storeId, userId);

  const populated = await Order.findById(order._id).populate(
    'customerId',
    'name email phone'
  );

  // Direct place for all methods (COD / JazzCash / EasyPaisa) — no gateway redirect yet.
  try {
    const orderEmailService = require('./orderEmailService');
    await orderEmailService.sendOrderPlacedEmail({ order: populated, store });
  } catch (err) {
    console.error('[placeOrder:email]', err?.message || err);
  }

  return populated;
};

const listCustomerOrders = async (storeId, userId, query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { storeId, customerId: userId };
  if (query.orderStatus) filter.orderStatus = query.orderStatus;

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-adminNote'),
    Order.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
};

const getCustomerOrder = async (storeId, userId, id) => {
  const filter = { storeId, customerId: userId };
  let order = null;
  if (receiptService.isObjectId(id)) {
    order = await Order.findOne({ ...filter, _id: id });
  }
  if (!order) {
    order = await Order.findOne({ ...filter, orderNumber: id });
  }
  if (!order) throw new AppError('Order not found', 404);
  return order;
};

const trackOrderPublic = async (storeId, { orderNumber, email, phone, token }) => {
  let order = null;
  if (token) {
    order = await Order.findOne({ storeId, trackingToken: token });
  }
  if (!order && orderNumber) {
    order = await Order.findOne({
      storeId,
      orderNumber: String(orderNumber).trim().toUpperCase(),
    });
  }
  if (!order) throw new AppError('Order not found', 404);

  if (email) {
    if (
      String(order.shippingAddress.email).toLowerCase() !==
      String(email).toLowerCase().trim()
    ) {
      throw new AppError('Email does not match this order', 403);
    }
  } else if (phone) {
    const digits = String(phone).replace(/\D/g, '').slice(-7);
    if (!String(order.shippingAddress.phone).replace(/\D/g, '').endsWith(digits)) {
      throw new AppError('Phone does not match this order', 403);
    }
  } else if (!token) {
    throw new AppError('Provide email or phone to track this order', 400);
  }

  return order;
};

const getCustomerReceipt = async (storeId, userId, id) => {
  const order = await getCustomerOrder(storeId, userId, id);
  const receipt = await receiptService.ensureReceiptForOrder(order);
  const serialized = receiptService.serializeReceipt(receipt, order);
  const orderItems = order.items || [];

  serialized.items = (serialized.items || []).map((item, idx) => {
    const match =
      orderItems[idx] || orderItems.find((line) => line.title === item.title);
    return {
      ...(item.toObject ? item.toObject() : item),
      imageUrl: item.imageUrl || match?.imageUrl,
      sku: item.sku || match?.sku,
      productId: item.productId || match?.productId,
    };
  });
  serialized.couponCode = order.couponCode || null;

  return serialized;
};

module.exports = {
  placeOrder,
  listCustomerOrders,
  getCustomerOrder,
  getCustomerReceipt,
  trackOrderPublic,
};
