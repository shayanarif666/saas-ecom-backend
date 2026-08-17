const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

/**
 * Atomically increment and return the next sequence for a key.
 * Example keys: order:<storeId>:20260801, receipt:<storeId>:20260801
 */
counterSchema.statics.getNextSequence = async function getNextSequence(key) {
  const counter = await this.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
