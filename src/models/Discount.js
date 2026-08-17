const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    applicableProductIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    ],
    applicableCategoryIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    ],
    minOrderAmount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, default: null, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

discountSchema.index({ storeId: 1, code: 1 }, { unique: true });
discountSchema.index({ storeId: 1, isActive: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Discount', discountSchema);
