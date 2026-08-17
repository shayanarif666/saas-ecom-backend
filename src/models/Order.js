const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const PAYMENT_METHODS = ['cod', 'jazzcash', 'easypaisa'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    addressLine: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    note: { type: String, trim: true },
    location: { type: String, trim: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isCustomerVisible: { type: Boolean, default: true },
  },
  { _id: false }
);

const shippingSchema = new mongoose.Schema(
  {
    carrier: { type: String, trim: true },
    trackingNumber: { type: String, trim: true },
    trackingUrl: { type: String, trim: true },
    estimatedDeliveryFrom: { type: Date },
    estimatedDeliveryTo: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    refundedAt: { type: Date, required: true },
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    orderNumber: { type: String, required: true, trim: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    couponCode: { type: String, trim: true, uppercase: true },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: function seedHistory() {
        return [
          {
            status: 'pending',
            note: 'Order placed',
            changedAt: new Date(),
            isCustomerVisible: true,
          },
        ];
      },
    },
    shipping: { type: shippingSchema, default: () => ({}) },
    trackingToken: {
      type: String,
      required: true,
      unique: true,
      default: () => nanoid(24),
    },
    customerNote: { type: String, trim: true },
    adminNote: { type: String, trim: true },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true },
    refund: { type: refundSchema, default: undefined },
    placedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

orderSchema.index({ storeId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ storeId: 1, orderStatus: 1 });
orderSchema.index({ storeId: 1, paymentStatus: 1 });
orderSchema.index({ storeId: 1, customerId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ storeId: 1, 'shipping.trackingNumber': 1 }, { sparse: true });
orderSchema.index({ storeId: 1, paymentMethod: 1, createdAt: -1 });
orderSchema.index({ 'shippingAddress.email': 1, orderNumber: 1 });
orderSchema.index({ 'shippingAddress.phone': 1, orderNumber: 1 });

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;
orderSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
