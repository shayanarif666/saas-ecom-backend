const Review = require('../models/Review');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta } = require('../utils/pagination');

const STATUS_VALUES = ['pending', 'approved', 'rejected'];

/**
 * Recalculate product rating aggregates from approved reviews.
 */
const refreshProductRatings = async (productId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        productId,
        status: 'approved',
      },
    },
    {
      $group: {
        _id: '$productId',
        ratingAverage: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const average = stats[0]
    ? Number(stats[0].ratingAverage.toFixed(2))
    : 0;
  const count = stats[0]?.ratingCount || 0;

  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAverage: average, ratingCount: count } }
  );
};

const serializeReview = (review) => {
  const doc = review.toObject ? review.toObject() : review;
  const productTitle =
    doc.productId && typeof doc.productId === 'object'
      ? doc.productId.title
      : undefined;
  const customerName =
    doc.customerId && typeof doc.customerId === 'object'
      ? doc.customerId.name
      : undefined;

  return {
    ...doc,
    product: productTitle || doc.product || '—',
    customer: customerName || doc.customer || '—',
    productId:
      doc.productId && typeof doc.productId === 'object'
        ? doc.productId._id
        : doc.productId,
    customerId:
      doc.customerId && typeof doc.customerId === 'object'
        ? doc.customerId._id
        : doc.customerId,
  };
};

const listReviews = async (storeId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { storeId };

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }
  if (query.productId) filter.productId = query.productId;
  if (query.rating) filter.rating = Number(query.rating);

  if (query.search) {
    const re = { $regex: query.search, $options: 'i' };
    filter.$or = [{ comment: re }];
  }

  const [items, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('productId', 'title images sku')
      .populate('customerId', 'name email phone'),
    Review.countDocuments(filter),
  ]);

  return {
    items: items.map(serializeReview),
    meta: buildMeta({ page, limit, total }),
  };
};

const getReviewById = async (storeId, id) => {
  const review = await Review.findOne({ _id: id, storeId })
    .populate('productId', 'title images sku')
    .populate('customerId', 'name email phone');
  if (!review) throw new AppError('Review not found', 404);
  return serializeReview(review);
};

const updateReviewStatus = async (storeId, id, status) => {
  if (!STATUS_VALUES.includes(status)) {
    throw new AppError('Invalid review status', 400);
  }

  const review = await Review.findOne({ _id: id, storeId });
  if (!review) throw new AppError('Review not found', 404);

  const previousStatus = review.status;
  if (previousStatus === status) {
    throw new AppError('Review is already in this status', 400);
  }

  review.status = status;
  await review.save();

  if (previousStatus === 'approved' || status === 'approved') {
    await refreshProductRatings(review.productId);
  }

  const populated = await Review.findById(review._id)
    .populate('productId', 'title images sku')
    .populate('customerId', 'name email phone');

  return serializeReview(populated);
};

const deleteReview = async (storeId, id) => {
  const review = await Review.findOneAndDelete({ _id: id, storeId });
  if (!review) throw new AppError('Review not found', 404);

  if (review.status === 'approved') {
    await refreshProductRatings(review.productId);
  }

  return review;
};

/**
 * Storefront shape: approved for everyone; author's own pending (and rejected) only.
 */
const serializePublicReview = (review) => {
  const doc = review.toObject ? review.toObject() : review;
  const customerName =
    doc.customerId && typeof doc.customerId === 'object'
      ? doc.customerId.name
      : doc.customerName || 'Customer';
  const customerId =
    doc.customerId && typeof doc.customerId === 'object'
      ? doc.customerId._id
      : doc.customerId;
  const productId =
    doc.productId && typeof doc.productId === 'object'
      ? doc.productId._id
      : doc.productId;

  return {
    id: String(doc._id),
    _id: doc._id,
    productId: productId ? String(productId) : null,
    customerId: customerId ? String(customerId) : null,
    customerName: customerName || 'Customer',
    rating: doc.rating,
    comment: doc.comment || '',
    status: doc.status,
    isVerifiedPurchase: Boolean(doc.isVerifiedPurchase),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * Public catalog reviews + (optional) the logged-in customer's own non-approved reviews.
 */
const listPublicProductReviews = async (storeId, productId, viewerCustomerId = null) => {
  const or = [{ status: 'approved' }];
  if (viewerCustomerId) {
    or.push({
      customerId: viewerCustomerId,
      status: { $in: ['pending', 'rejected'] },
    });
  }

  const items = await Review.find({ storeId, productId, $or: or })
    .sort({ createdAt: -1 })
    .populate('customerId', 'name')
    .lean();

  return items.map(serializePublicReview);
};

const createCustomerReview = async (storeId, customerId, { productId, rating, comment }) => {
  const product = await Product.findOne({
    _id: productId,
    storeId,
    isPublished: true,
  }).select('_id');

  if (!product) throw new AppError('Product not found', 404);

  const existing = await Review.findOne({ productId, customerId }).select('_id status');
  if (existing) {
    throw new AppError('You have already reviewed this product', 409);
  }

  const review = await Review.create({
    storeId,
    productId,
    customerId,
    rating: Number(rating),
    comment: String(comment || '').trim(),
    status: 'pending',
  });

  const populated = await Review.findById(review._id).populate('customerId', 'name');
  return serializePublicReview(populated);
};

module.exports = {
  listReviews,
  getReviewById,
  updateReviewStatus,
  deleteReview,
  refreshProductRatings,
  listPublicProductReviews,
  createCustomerReview,
  STATUS_VALUES,
};
