const mongoose = require('mongoose');

const suggestedSpecSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const categoryTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    parentTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryTemplate',
      default: null,
    },
    imageUrl: { type: String, trim: true },
    suggestedSpecs: { type: [suggestedSpecSchema], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

categoryTemplateSchema.index({ parentTemplateId: 1 });

module.exports = mongoose.model('CategoryTemplate', categoryTemplateSchema);
