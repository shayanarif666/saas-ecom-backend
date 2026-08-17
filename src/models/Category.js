const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    imageUrl: { type: String, trim: true },
    /** Lucide icon key, e.g. "book-open", "backpack" */
    icon: { type: String, trim: true, default: 'layers' },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categorySchema.index({ storeId: 1, slug: 1 }, { unique: true });
categorySchema.index({ storeId: 1, parentCategoryId: 1 });
categorySchema.index({ storeId: 1, isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);
