const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    ],
  },
  { timestamps: true }
);

wishlistSchema.index({ storeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
