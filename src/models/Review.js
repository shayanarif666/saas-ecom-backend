const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    isVerifiedPurchase: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

reviewSchema.index({ storeId: 1, productId: 1, status: 1 });
reviewSchema.index({ storeId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ productId: 1, customerId: 1 }, { unique: true });
reviewSchema.index({ orderId: 1 }, { sparse: true });

module.exports = mongoose.model('Review', reviewSchema);
