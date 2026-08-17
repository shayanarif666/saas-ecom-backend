const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const storefrontService = require('../services/storefrontService');
const storefrontAuthService = require('../services/storefrontAuthService');
const cartService = require('../services/cartService');
const wishlistService = require('../services/wishlistService');
const addressService = require('../services/addressService');
const storefrontOrderService = require('../services/storefrontOrderService');
const discountService = require('../services/discountService');
const reviewService = require('../services/reviewService');
const {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} = require('../utils/tokens');
const { resolveDomainFromRequest } = require('../middlewares/resolveStorefront');

const resolve = asyncHandler(async (req, res) => {
  const domain = resolveDomainFromRequest(req);
  const store = await storefrontService.resolveStoreByDomain(domain);
  return successResponse(res, {
    message: 'Store resolved',
    data: { store, resolvedDomain: store.customDomain },
  });
});

const listProducts = asyncHandler(async (req, res) => {
  const result = await storefrontService.listPublicProducts(req.storeId, req.query);
  return successResponse(res, {
    message: 'Products fetched',
    data: { products: result.items, items: result.items },
    meta: result.meta,
  });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await storefrontService.getPublicProductBySlug(
    req.storeId,
    req.params.slug
  );
  return successResponse(res, {
    message: 'Product fetched',
    data: { product },
  });
});

const relatedProducts = asyncHandler(async (req, res) => {
  const product = await storefrontService.getPublicProductBySlug(
    req.storeId,
    req.params.slug
  );
  const items = await storefrontService.getRelatedProducts(
    req.storeId,
    product,
    Number(req.query.limit) || 8
  );
  return successResponse(res, {
    message: 'Related products fetched',
    data: { products: items, items },
  });
});

const listCategories = asyncHandler(async (req, res) => {
  const result = await storefrontService.listPublicCategories(req.storeId, req.query);
  return successResponse(res, {
    message: 'Categories fetched',
    data: { categories: result.items, items: result.items },
    meta: result.meta,
  });
});

const register = asyncHandler(async (req, res) => {
  const result = await storefrontAuthService.registerCustomer(req.storeId, req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  return successResponse(res, {
    statusCode: 201,
    message: 'Registered successfully',
    data: { user: result.user, accessToken: result.accessToken },
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await storefrontAuthService.loginCustomer(req.storeId, req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  return successResponse(res, {
    message: 'Login successful',
    data: { user: result.user, accessToken: result.accessToken },
  });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  return successResponse(res, { message: 'Logged out', data: null });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  const result = await storefrontAuthService.refreshCustomer(
    req.storeId,
    refreshToken
  );
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  return successResponse(res, {
    message: 'Token refreshed',
    data: { user: result.user, accessToken: result.accessToken },
  });
});

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getOrCreateCart(req.storeId, req.user.id);
  return successResponse(res, {
    message: 'Cart fetched',
    data: { cart: cartService.serializeCart(cart) },
  });
});

const putCart = asyncHandler(async (req, res) => {
  const cart = await cartService.replaceCartItems(
    req.storeId,
    req.user.id,
    req.body.items,
    req.body.couponCode
  );
  return successResponse(res, { message: 'Cart updated', data: { cart } });
});

const getWishlist = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.getOrCreateWishlist(req.storeId, req.user.id);
  return successResponse(res, {
    message: 'Wishlist fetched',
    data: { wishlist: wishlistService.serializeWishlist(wishlist) },
  });
});

const putWishlist = asyncHandler(async (req, res) => {
  const wishlist = await wishlistService.replaceWishlistProducts(
    req.storeId,
    req.user.id,
    req.body.productIds
  );
  return successResponse(res, { message: 'Wishlist updated', data: { wishlist } });
});

const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.listAddresses(req.storeId, req.user.id);
  return successResponse(res, {
    message: 'Addresses fetched',
    data: { addresses },
  });
});

const createAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(
    req.storeId,
    req.user.id,
    req.body
  );
  return successResponse(res, {
    statusCode: 201,
    message: 'Address created',
    data: { address },
  });
});

const updateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(
    req.storeId,
    req.user.id,
    req.params.id,
    req.body
  );
  return successResponse(res, { message: 'Address updated', data: { address } });
});

const deleteAddress = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.storeId, req.user.id, req.params.id);
  return successResponse(res, { message: 'Address deleted', data: null });
});

const placeOrder = asyncHandler(async (req, res) => {
  const order = await storefrontOrderService.placeOrder(
    req.storeId,
    req.user.id,
    req.body
  );
  return successResponse(res, {
    statusCode: 201,
    message: 'Order placed',
    data: { order },
  });
});

const listOrders = asyncHandler(async (req, res) => {
  const result = await storefrontOrderService.listCustomerOrders(
    req.storeId,
    req.user.id,
    req.query
  );
  return successResponse(res, {
    message: 'Orders fetched',
    data: { orders: result.items, items: result.items },
    meta: result.meta,
  });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await storefrontOrderService.getCustomerOrder(
    req.storeId,
    req.user.id,
    req.params.id
  );
  return successResponse(res, { message: 'Order fetched', data: { order } });
});

const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await storefrontOrderService.getCustomerReceipt(
    req.storeId,
    req.user.id,
    req.params.id
  );
  return successResponse(res, { message: 'Receipt fetched', data: { receipt } });
});

const trackOrder = asyncHandler(async (req, res) => {
  const order = await storefrontOrderService.trackOrderPublic(req.storeId, {
    ...req.body,
    ...req.query,
  });
  return successResponse(res, { message: 'Order found', data: { order } });
});

const listProductReviews = asyncHandler(async (req, res) => {
  const product = await storefrontService.getPublicProductBySlug(
    req.storeId,
    req.params.slug
  );
  const viewerCustomerId =
    req.user?.role === 'customer' ? req.user.id || req.user._id : null;
  const reviews = await reviewService.listPublicProductReviews(
    req.storeId,
    product._id || product.id,
    viewerCustomerId
  );
  return successResponse(res, {
    message: 'Reviews fetched',
    data: { reviews },
  });
});

const createProductReview = asyncHandler(async (req, res) => {
  const product = await storefrontService.getPublicProductBySlug(
    req.storeId,
    req.params.slug
  );
  const review = await reviewService.createCustomerReview(
    req.storeId,
    req.user.id,
    {
      productId: product._id || product.id,
      rating: req.body.rating,
      comment: req.body.comment,
    }
  );
  return successResponse(res, {
    statusCode: 201,
    message: 'Review submitted for approval',
    data: { review },
  });
});

const validateCoupon = asyncHandler(async (req, res) => {
  const result = await discountService.validateDiscountCode(
    req.storeId,
    req.body.code || req.body.couponCode,
    Number(req.body.subtotal) || 0
  );
  return successResponse(res, {
    message: 'Coupon valid',
    data: {
      code: result.discount.code,
      type: result.discount.type,
      value: result.discount.value,
      discountAmount: result.discountAmount,
      label: result.label,
      message: result.message,
      minOrderAmount: result.discount.minOrderAmount || 0,
    },
  });
});

module.exports = {
  resolve,
  listProducts,
  getProductBySlug,
  relatedProducts,
  listCategories,
  register,
  login,
  logout,
  refresh,
  getCart,
  putCart,
  getWishlist,
  putWishlist,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  placeOrder,
  listOrders,
  getOrder,
  getReceipt,
  trackOrder,
  listProductReviews,
  createProductReview,
  validateCoupon,
};
