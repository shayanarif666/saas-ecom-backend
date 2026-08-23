const mongoose = require('mongoose');

const specificationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    images: { type: [String], default: [] },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: null, min: 0 },
    currency: { type: String, default: 'PKR', trim: true },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    isPublished: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
    specifications: { type: [specificationSchema], default: [] },
    /** Storefront Quick facts panel — separate from specifications */
    quickFacts: { type: [specificationSchema], default: [] },
    /** Storefront "Key highlights" — 2 to 4 short bullets */
    keyHighlights: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length <= 4 &&
          arr.every((s) => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= 200),
        message: 'keyHighlights must be up to 4 non-empty strings (max 200 chars each)',
      },
    },
    author: { type: String, trim: true },
    publisher: { type: String, trim: true },
    language: { type: String, trim: true },
    isbn: { type: String, trim: true },
    /** When true, storefront shows color swatches from `colors` */
    hasColors: { type: Boolean, default: false },
    colors: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length <= 24 &&
          arr.every((c) => typeof c === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c.trim())),
        message: 'colors must be hex values like #fff or #ffffff (max 24)',
      },
    },
    /** When true, storefront shows size options from `sizes` */
    hasSizes: { type: Boolean, default: false },
    sizes: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length <= 12 &&
          arr.every((s) => typeof s === 'string' && s.trim().length > 0 && s.trim().length <= 40),
        message: 'sizes must be non-empty strings (max 12)',
      },
    },
  },
  { timestamps: true }
);

productSchema.index({ storeId: 1, slug: 1 }, { unique: true });
productSchema.index({ storeId: 1, sku: 1 }, { unique: true });
productSchema.index({ storeId: 1, categoryId: 1 });
productSchema.index({ storeId: 1, isPublished: 1, createdAt: -1 });
productSchema.index({ storeId: 1, soldCount: -1 });
productSchema.index({ storeId: 1, price: 1 });
productSchema.index({ storeId: 1, ratingAverage: -1 });
productSchema.index({ storeId: 1, author: 1 });
productSchema.index({ storeId: 1, publisher: 1 });
productSchema.index({ storeId: 1, language: 1 });
productSchema.index({ title: 'text', description: 'text', author: 'text', sku: 'text' });

module.exports = mongoose.model('Product', productSchema);
