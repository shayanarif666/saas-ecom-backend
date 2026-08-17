const mongoose = require('mongoose');

/**
 * Temporary pending registration + OTP until email is verified.
 * After verify, document is deleted and User + Store are created.
 */
const registrationOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    payload: {
      name: { type: String, required: true },
      phone: { type: String },
      passwordHash: { type: String, required: true },
      storeName: { type: String, required: true },
      customDomain: { type: String, required: true, lowercase: true, trim: true },
      businessType: { type: String, default: 'bookstore' },
      storeSlug: { type: String },
    },
  },
  { timestamps: true }
);

registrationOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RegistrationOtp', registrationOtpSchema);
