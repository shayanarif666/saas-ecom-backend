const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR', trim: true },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: true,
    },
    maxProducts: { type: Number, default: null, min: 0 },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

subscriptionPlanSchema.index({ isActive: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
