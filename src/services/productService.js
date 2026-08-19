const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { toSlug, ensureUniqueSlug } = require('../utils/slug');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { persistImageList } = require('./uploadService');

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  title: { title: 1 },
  stock: { stockQuantity: 1 },
  bestselling: { soldCount: -1 },
  rating: { ratingAverage: -1 },
  discount: { discountPrice: 1 },
};

const assertPricing = (price, discountPrice) => {
  if (
    discountPrice != null &&
    discountPrice !== '' &&
    Number(discountPrice) > Number(price)
  ) {
    throw new AppError('Discount price cannot exceed the regular price', 400);
  }
};

const normalizeHighlights = (highlights) => {
  if (!Array.isArray(highlights)) return [];
  return highlights.map((h) => String(h || '').trim()).filter(Boolean);
};

const assertHighlights = (highlights) => {
  const list = normalizeHighlights(highlights);
  if (list.length < 2 || list.length > 4) {
    throw new AppError('Provide between 2 and 4 key highlights', 400);
  }
  return list;
};

const listProducts = async (storeId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { storeId };

  if (Array.isArray(query.categoryIds)) {
    if (!query.categoryIds.length) {
      return { items: [], meta: buildMeta({ page, limit, total: 0 }) };
    }
    filter.categoryId = { $in: query.categoryIds };
  } else if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  if (query.isPublished !== undefined) filter.isPublished = query.isPublished;

  const stockStatus = query.stockStatus || null;
  if (stockStatus === 'out') {
    filter.stockQuantity = { $lte: 0 };
  } else if (stockStatus === 'low' || query.lowStock) {
    filter.$expr = {
      $and: [
        { $gt: ['$stockQuantity', 0] },
        { $lte: ['$stockQuantity', '$lowStockThreshold'] },
      ],
    };
  } else if (stockStatus === 'in') {
    filter.$expr = { $gt: ['$stockQuantity', '$lowStockThreshold'] };
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { sku: { $regex: query.search, $options: 'i' } },
      { author: { $regex: query.search, $options: 'i' } },
      { isbn: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }

  const minPrice = query.minPrice !== undefined && query.minPrice !== '' ? Number(query.minPrice) : NaN;
  const maxPrice = query.maxPrice !== undefined && query.maxPrice !== '' ? Number(query.maxPrice) : NaN;
  if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
    const effective = {
      $cond: [
        {
          $and: [
            { $ne: ['$discountPrice', null] },
            { $lt: ['$discountPrice', '$price'] },
          ],
        },
        '$discountPrice',
        '$price',
      ],
    };
    const exprs = [];
    if (!Number.isNaN(minPrice)) exprs.push({ $gte: [effective, minPrice] });
    if (!Number.isNaN(maxPrice)) exprs.push({ $lte: [effective, maxPrice] });
    const priceExpr = exprs.length === 1 ? exprs[0] : { $and: exprs };
    filter.$expr = filter.$expr ? { $and: [filter.$expr, priceExpr] } : priceExpr;
  }

  if (query.rating !== undefined && query.rating !== '' && query.rating != null) {
    const minRating = Number(query.rating);
    if (!Number.isNaN(minRating) && minRating > 0) {
      filter.ratingAverage = { $gte: minRating };
    }
  }

  if (query.sort === 'discount') {
    filter.discountPrice = { $ne: null, $gt: 0 };
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORT_MAP[query.sort] || SORT_MAP.newest)
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name slug'),
    Product.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
};

const getProductById = async (storeId, id) => {
  const product = await Product.findOne({ _id: id, storeId }).populate(
    'categoryId',
    'name slug'
  );
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

const getProductBySlug = async (storeId, slug) => {
  const product = await Product.findOne({ storeId, slug }).populate(
    'categoryId',
    'name slug'
  );
  if (!product) throw new AppError('Product not found', 404);
  return product;
};

const createProduct = async (storeId, payload) => {
  const category = await Category.findOne({ _id: payload.categoryId, storeId });
  if (!category) throw new AppError('Category not found in this store', 400);

  assertPricing(payload.price, payload.discountPrice);
  const keyHighlights = assertHighlights(payload.keyHighlights);

  const skuExists = await Product.exists({
    storeId,
    sku: payload.sku.toUpperCase(),
  });
  if (skuExists) throw new AppError('SKU already exists in this store', 409);

  const baseSlug = toSlug(payload.slug || payload.title);
  const slug = await ensureUniqueSlug(Product, { storeId, baseSlug });
  const images = await persistImageList(payload.images || [], {
    folder: `bookstore/store-${storeId}/products`,
  });

  const product = await Product.create({
    ...payload,
    images,
    storeId,
    slug,
    sku: payload.sku.toUpperCase(),
    stockQuantity: Math.max(0, payload.stockQuantity ?? 0),
    keyHighlights,
  });

  return product.populate('categoryId', 'name slug');
};

const updateProduct = async (storeId, id, payload) => {
  const product = await Product.findOne({ _id: id, storeId });
  if (!product) throw new AppError('Product not found', 404);

  if (payload.categoryId) {
    const category = await Category.findOne({ _id: payload.categoryId, storeId });
    if (!category) throw new AppError('Category not found in this store', 400);
  }

  const nextPrice = payload.price !== undefined ? payload.price : product.price;
  const nextDiscount =
    payload.discountPrice !== undefined
      ? payload.discountPrice
      : product.discountPrice;
  assertPricing(nextPrice, nextDiscount);

  if (payload.sku) {
    const skuExists = await Product.exists({
      storeId,
      sku: payload.sku.toUpperCase(),
      _id: { $ne: id },
    });
    if (skuExists) throw new AppError('SKU already exists in this store', 409);
  }

  const fields = [
    'categoryId',
    'title',
    'sku',
    'description',
    'images',
    'price',
    'discountPrice',
    'currency',
    'stockQuantity',
    'lowStockThreshold',
    'isPublished',
    'specifications',
    'quickFacts',
    'keyHighlights',
    'author',
    'publisher',
    'language',
    'isbn',
  ];

  for (const key of fields) {
    if (payload[key] !== undefined) {
      if (key === 'keyHighlights') {
        product.keyHighlights = assertHighlights(payload.keyHighlights);
      } else if (key === 'images') {
        product.images = await persistImageList(payload.images, {
          folder: `bookstore/store-${storeId}/products`,
        });
      } else {
        product[key] = payload[key] === '' ? undefined : payload[key];
      }
    }
  }

  if (payload.stockQuantity !== undefined) {
    product.stockQuantity = Math.max(0, Number(payload.stockQuantity) || 0);
  }

  if (payload.slug || payload.title) {
    const baseSlug = toSlug(payload.slug || payload.title || product.title);
    product.slug = await ensureUniqueSlug(Product, {
      storeId,
      baseSlug,
      excludeId: product._id,
    });
  }

  if (payload.sku) product.sku = payload.sku.toUpperCase();

  await product.save();
  return product.populate('categoryId', 'name slug');
};

const deleteProduct = async (storeId, id) => {
  const product = await Product.findOne({ _id: id, storeId });
  if (!product) throw new AppError('Product not found', 404);

  const openOrder = await Order.exists({
    storeId,
    'items.productId': id,
    orderStatus: { $nin: ['cancelled', 'delivered'] },
  });
  if (openOrder) {
    throw new AppError(
      'Cannot delete product while it appears on active orders. Unpublish it instead.',
      400
    );
  }

  await product.deleteOne();
  return product;
};

module.exports = {
  listProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};
