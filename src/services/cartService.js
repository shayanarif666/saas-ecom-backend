const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

const effectivePrice = (product) => {
  if (product.discountPrice != null && product.discountPrice < product.price) {
    return product.discountPrice;
  }
  return product.price;
};

const populateCart = async (cart) => {
  await cart.populate({
    path: 'items.productId',
    select:
      'title slug sku images price discountPrice stockQuantity isPublished author',
  });
  return cart;
};

const getOrCreateCart = async (storeId, userId) => {
  let cart = await Cart.findOne({ storeId, userId });
  if (!cart) {
    cart = await Cart.create({ storeId, userId, items: [] });
  }
  return populateCart(cart);
};

const serializeCart = (cart) => {
  const items = (cart.items || []).map((item) => {
    const product = item.productId;
    return {
      _id: item._id,
      productId: product?._id || item.productId,
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      product: product
        ? {
            _id: product._id,
            id: product._id,
            title: product.title,
            slug: product.slug,
            sku: product.sku,
            images: product.images,
            price: product.price,
            discountPrice: product.discountPrice,
            stockQuantity: product.stockQuantity,
            author: product.author,
            isPublished: product.isPublished,
          }
        : null,
    };
  });

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.priceAtAdd || 0) * Number(i.quantity || 0),
    0
  );

  return {
    _id: cart._id,
    storeId: cart.storeId,
    userId: cart.userId,
    items,
    couponCode: cart.couponCode || null,
    subtotal: Number(subtotal.toFixed(2)),
  };
};

const replaceCartItems = async (storeId, userId, items = [], couponCode) => {
  if (!Array.isArray(items)) throw new AppError('items must be an array', 400);

  const normalized = [];
  for (const raw of items) {
    const productId = raw.productId || raw._id;
    const quantity = Number(raw.quantity) || 0;
    if (!productId || quantity < 1) continue;

    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findOne({ _id: productId, storeId, isPublished: true });
    if (!product) {
      throw new AppError('One or more products are unavailable in this store', 400);
    }
    if (product.stockQuantity < quantity) {
      throw new AppError(`Insufficient stock for "${product.title}"`, 400);
    }

    normalized.push({
      productId: product._id,
      quantity,
      priceAtAdd: effectivePrice(product),
    });
  }

  const cart = await getOrCreateCart(storeId, userId);
  cart.items = normalized;
  if (couponCode !== undefined) {
    cart.couponCode = couponCode ? String(couponCode).toUpperCase() : undefined;
  }
  await cart.save();
  return serializeCart(await populateCart(cart));
};

const clearCart = async (storeId, userId) => {
  const cart = await getOrCreateCart(storeId, userId);
  cart.items = [];
  cart.couponCode = undefined;
  await cart.save();
  return serializeCart(cart);
};

module.exports = {
  getOrCreateCart,
  serializeCart,
  replaceCartItems,
  clearCart,
  effectivePrice,
};
