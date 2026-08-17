const mongoose = require('mongoose');

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentMethod: { type: String, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ storeId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ status: 1 });

module.exports = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
