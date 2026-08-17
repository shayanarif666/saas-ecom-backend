const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    },
    gateway: {
      type: String,
      enum: ['jazzcash', 'easypaisa', 'cod'],
      required: true,
    },
    gatewayTransactionId: { type: String, trim: true, default: null },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR', trim: true },
    status: {
      type: String,
      enum: ['initiated', 'success', 'failed'],
      default: 'initiated',
    },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ storeId: 1, orderId: 1 });
paymentSchema.index({ gatewayTransactionId: 1 }, { sparse: true });
paymentSchema.index({ storeId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
