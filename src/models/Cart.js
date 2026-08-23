const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    priceAtAdd: { type: Number, required: true, min: 0 },
    /** Selected color hex values for this line (max = quantity) */
    colors: { type: [String], default: [] },
    /** Selected size labels for this line (max = quantity) */
    sizes: { type: [String], default: [] },
    /** Customer note / extra information for this line */
    extraInfo: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
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
    items: { type: [cartItemSchema], default: [] },
    couponCode: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true }
);

cartSchema.index({ storeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Cart', cartSchema);
