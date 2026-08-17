const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const storeSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactEmail: { type: String, trim: true, lowercase: true },
    logoUrl: { type: String, trim: true },
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    receiptNumber: { type: String, required: true, trim: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    items: {
      type: [receiptItemSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'Receipt must contain at least one item',
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cod', 'jazzcash', 'easypaisa'],
      required: true,
    },
    issuedAt: { type: Date, default: Date.now },
    storeSnapshot: { type: storeSnapshotSchema, required: true },
  },
  { timestamps: true }
);

receiptSchema.index({ storeId: 1, receiptNumber: 1 }, { unique: true });
receiptSchema.index({ storeId: 1, customerId: 1, issuedAt: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);
