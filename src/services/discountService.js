const Discount = require('../models/Discount');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta } = require('../utils/pagination');

const listDiscounts = async (storeId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { storeId };

  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.type) filter.type = query.type;
  if (query.search) {
    filter.code = { $regex: query.search, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    Discount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Discount.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
};

const getDiscountById = async (storeId, id) => {
  const discount = await Discount.findOne({ _id: id, storeId });
  if (!discount) throw new AppError('Discount not found', 404);
  return discount;
};

const assertDiscountRules = (payload, existing = {}) => {
  const type = payload.type ?? existing.type;
  const value = payload.value ?? existing.value;
  const startDate = payload.startDate
    ? new Date(payload.startDate)
    : existing.startDate
      ? new Date(existing.startDate)
      : null;
  const endDate = payload.endDate
    ? new Date(payload.endDate)
    : existing.endDate
      ? new Date(existing.endDate)
      : null;

  if (type === 'percentage' && value > 100) {
    throw new AppError('Percentage cannot exceed 100', 400);
  }
  if (type === 'fixed' && value < 0) {
    throw new AppError('Fixed discount value cannot be negative', 400);
  }
  if (startDate && endDate && endDate <= startDate) {
    throw new AppError('End date must be after start date', 400);
  }
};

/**
 * Validate a coupon code for an order subtotal (storefront / checkout helper).
 */
const validateDiscountCode = async (storeId, code, orderSubtotal = 0) => {
  const discount = await Discount.findOne({
    storeId,
    code: String(code || '').toUpperCase(),
  });

  if (!discount) throw new AppError('Invalid discount code', 404);
  if (!discount.isActive) throw new AppError('This discount is inactive', 400);

  const now = new Date();
  if (now < discount.startDate) {
    throw new AppError('This discount is not active yet', 400);
  }
  if (now > discount.endDate) {
    throw new AppError('This discount has expired', 400);
  }
  if (
    discount.usageLimit != null &&
    discount.usedCount >= discount.usageLimit
  ) {
    throw new AppError('This discount has reached its usage limit', 400);
  }
  if (orderSubtotal < (discount.minOrderAmount || 0)) {
    throw new AppError(
      `Minimum order amount of ${discount.minOrderAmount} required`,
      400
    );
  }

  let discountAmount = 0;
  if (discount.type === 'percentage') {
    discountAmount = (orderSubtotal * discount.value) / 100;
  } else {
    discountAmount = discount.value;
  }
  discountAmount = Math.min(discountAmount, orderSubtotal);
  discountAmount = Number(discountAmount.toFixed(2));

  const label =
    discount.type === 'percentage'
      ? `${discount.value}% off`
      : `${discount.value} off`;

  return {
    discount,
    discountAmount,
    label,
    message: `Coupon ${discount.code} applied (${label})`,
  };
};

const incrementDiscountUsage = async (discountId) => {
  if (!discountId) return;
  await Discount.updateOne({ _id: discountId }, { $inc: { usedCount: 1 } });
};

const createDiscount = async (storeId, payload) => {
  assertDiscountRules(payload);

  const exists = await Discount.exists({
    storeId,
    code: payload.code.toUpperCase(),
  });
  if (exists) throw new AppError('Discount code already exists in this store', 409);

  return Discount.create({
    ...payload,
    storeId,
    code: payload.code.toUpperCase(),
    usedCount: 0,
  });
};

const updateDiscount = async (storeId, id, payload) => {
  const discount = await Discount.findOne({ _id: id, storeId });
  if (!discount) throw new AppError('Discount not found', 404);

  assertDiscountRules(payload, discount);

  if (payload.code && payload.code.toUpperCase() !== discount.code) {
    const exists = await Discount.exists({
      storeId,
      code: payload.code.toUpperCase(),
      _id: { $ne: id },
    });
    if (exists) throw new AppError('Discount code already exists in this store', 409);
    discount.code = payload.code.toUpperCase();
  }

  const fields = [
    'type',
    'value',
    'applicableProductIds',
    'applicableCategoryIds',
    'minOrderAmount',
    'startDate',
    'endDate',
    'usageLimit',
    'isActive',
  ];

  for (const key of fields) {
    if (payload[key] !== undefined) discount[key] = payload[key];
  }

  await discount.save();
  return discount;
};

const deleteDiscount = async (storeId, id) => {
  const discount = await Discount.findOneAndDelete({ _id: id, storeId });
  if (!discount) throw new AppError('Discount not found', 404);
  return discount;
};

module.exports = {
  listDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  validateDiscountCode,
  incrementDiscountUsage,
};
