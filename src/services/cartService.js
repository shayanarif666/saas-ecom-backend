const Cart = require('../models/Cart');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

const effectivePrice = (product) => {
  if (product.discountPrice != null && product.discountPrice < product.price) {
    return product.discountPrice;
  }
  return product.price;
};

const normalizeHex = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(raw)) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw;
};

const normalizeLineVariants = (raw = {}, quantity = 1) => {
  const colors = [
    ...new Set(
      (Array.isArray(raw.colors)
        ? raw.colors
        : raw.color
          ? [raw.color]
          : []
      )
        .map(normalizeHex)
        .filter(Boolean)
    ),
  ];
  const sizes = [
    ...new Set(
      (Array.isArray(raw.sizes)
        ? raw.sizes
        : raw.size
          ? [raw.size]
          : []
      )
        .map((s) => String(s || '').trim())
        .filter(Boolean)
    ),
  ];
  const extraInfo = String(raw.extraInfo || '').trim().slice(0, 500);

  if (colors.length > quantity) {
    throw new AppError('Selected colors cannot exceed the line quantity', 400);
  }
  if (sizes.length > quantity) {
    throw new AppError('Selected sizes cannot exceed the line quantity', 400);
  }

  return { colors, sizes, extraInfo };
};

const populateCart = async (cart) => {
  await cart.populate({
    path: 'items.productId',
    select:
      'title slug sku images price discountPrice stockQuantity isPublished author hasColors colors hasSizes sizes',
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
    const colors = Array.isArray(item.colors) ? item.colors : [];
    const sizes = Array.isArray(item.sizes) ? item.sizes : [];
    return {
      _id: item._id,
      productId: product?._id || item.productId,
      quantity: item.quantity,
      priceAtAdd: item.priceAtAdd,
      colors,
      sizes,
      extraInfo: item.extraInfo || '',
      // back-compat for older FE
      color: colors[0] || null,
      size: sizes[0] || null,
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
            hasColors: product.hasColors,
            colors: product.colors,
            hasSizes: product.hasSizes,
            sizes: product.sizes,
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
  const qtyByProduct = new Map();

  for (const raw of items) {
    const productId = raw.productId || raw._id;
    const quantity = Number(raw.quantity) || 0;
    if (!productId || quantity < 1) continue;

    const variants = normalizeLineVariants(raw, quantity);

    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findOne({ _id: productId, storeId, isPublished: true });
    if (!product) {
      throw new AppError('One or more products are unavailable in this store', 400);
    }

    if (product.hasColors && variants.colors.length === 0) {
      throw new AppError(`Select at least one color for "${product.title}"`, 400);
    }
    if (product.hasSizes && variants.sizes.length === 0) {
      throw new AppError(`Select at least one size for "${product.title}"`, 400);
    }
    if (variants.colors.length) {
      const allowed = new Set((product.colors || []).map((c) => String(c).toLowerCase()));
      if (variants.colors.some((c) => !allowed.has(c))) {
        throw new AppError(`Invalid color selected for "${product.title}"`, 400);
      }
    }
    if (variants.sizes.length) {
      const allowed = new Set(product.sizes || []);
      if (variants.sizes.some((s) => !allowed.has(s))) {
        throw new AppError(`Invalid size selected for "${product.title}"`, 400);
      }
    }

    const key = String(product._id);
    qtyByProduct.set(key, (qtyByProduct.get(key) || 0) + quantity);

    normalized.push({
      productId: product._id,
      quantity,
      priceAtAdd: effectivePrice(product),
      colors: variants.colors,
      sizes: variants.sizes,
      extraInfo: variants.extraInfo,
    });
  }

  for (const [productId, totalQty] of qtyByProduct.entries()) {
    // eslint-disable-next-line no-await-in-loop
    const product = await Product.findById(productId).select('title stockQuantity');
    if (product && product.stockQuantity < totalQty) {
      throw new AppError(`Insufficient stock for "${product.title}"`, 400);
    }
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
