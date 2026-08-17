const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

const PRODUCT_SELECT =
  'title slug sku images price discountPrice stockQuantity isPublished author ratingAverage ratingCount soldCount lowStockThreshold categoryId';

const populateWishlist = async (wishlist) => {
  await wishlist.populate({
    path: 'productIds',
    select: PRODUCT_SELECT,
    populate: { path: 'categoryId', select: 'name slug' },
  });
  return wishlist;
};

const getOrCreateWishlist = async (storeId, userId) => {
  let wishlist = await Wishlist.findOne({ storeId, userId });
  if (!wishlist) {
    wishlist = await Wishlist.create({ storeId, userId, productIds: [] });
  }
  return populateWishlist(wishlist);
};

const serializeWishlist = (wishlist) => {
  const products = (wishlist.productIds || [])
    .filter((p) => p && typeof p === 'object' && p._id && p.isPublished !== false)
    .map((product) => ({
      _id: product._id,
      id: product._id,
      title: product.title,
      slug: product.slug,
      sku: product.sku,
      images: product.images || [],
      price: product.price,
      discountPrice: product.discountPrice,
      stockQuantity: product.stockQuantity,
      author: product.author,
      ratingAverage: product.ratingAverage,
      ratingCount: product.ratingCount,
      soldCount: product.soldCount,
      lowStockThreshold: product.lowStockThreshold,
      categoryId: product.categoryId?._id || product.categoryId || null,
      category: product.categoryId?.name
        ? {
            id: product.categoryId._id,
            name: product.categoryId.name,
            slug: product.categoryId.slug,
          }
        : null,
      isPublished: product.isPublished,
    }));

  return {
    _id: wishlist._id,
    storeId: wishlist.storeId,
    userId: wishlist.userId,
    productIds: products.map((p) => String(p._id)),
    products,
  };
};

const replaceWishlistProducts = async (storeId, userId, productIds = []) => {
  if (!Array.isArray(productIds)) {
    throw new AppError('productIds must be an array', 400);
  }

  const uniqueIds = [
    ...new Set(
      productIds
        .map((id) => (id && typeof id === 'object' ? id._id || id.id : id))
        .filter(Boolean)
        .map(String)
    ),
  ];

  let validIds = [];
  if (uniqueIds.length) {
    const products = await Product.find({
      _id: { $in: uniqueIds },
      storeId,
      isPublished: true,
    }).select('_id');
    const found = new Set(products.map((p) => String(p._id)));
    // Preserve client order for IDs that still exist
    validIds = uniqueIds.filter((id) => found.has(id));
  }

  const wishlist = await getOrCreateWishlist(storeId, userId);
  wishlist.productIds = validIds;
  await wishlist.save();
  return serializeWishlist(await populateWishlist(wishlist));
};

module.exports = {
  getOrCreateWishlist,
  serializeWishlist,
  replaceWishlistProducts,
};
