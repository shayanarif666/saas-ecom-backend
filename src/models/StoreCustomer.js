const mongoose = require('mongoose');

const storeCustomerSchema = new mongoose.Schema(
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
    totalOrders: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastOrderAt: { type: Date, default: null },
    firstOrderAt: { type: Date, default: null },
  },
  { timestamps: true }
);

storeCustomerSchema.index({ storeId: 1, userId: 1 }, { unique: true });
storeCustomerSchema.index({ storeId: 1, lastOrderAt: -1 });
storeCustomerSchema.index({ storeId: 1, totalSpent: -1 });

module.exports = mongoose.model('StoreCustomer', storeCustomerSchema);
