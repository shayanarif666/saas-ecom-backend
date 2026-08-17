const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriberSchema.index({ storeId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Subscriber', subscriberSchema);
