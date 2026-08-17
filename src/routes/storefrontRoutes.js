const express = require('express');
const storefrontController = require('../controllers/storefrontController');
const verifyJWT = require('../middlewares/verifyJWT');
const { optionalJWT } = require('../middlewares/verifyJWT');
const {
  requireStoreParam,
  requireStoreCustomer,
} = require('../middlewares/resolveStorefront');
const validate = require('../middlewares/validate');
const storefrontValidation = require('../validations/storefrontValidation');

const router = express.Router();

/** Resolve tenant by domain (localhost → DEFAULT_STORE_DOMAIN) */
router.get('/resolve', storefrontController.resolve);

/**
 * All routes below are scoped to :storeId.
 * Public catalog + track; auth/cart/orders/addresses require customer JWT for that store.
 */
router.use('/:storeId', requireStoreParam);

router.get('/:storeId/products', storefrontController.listProducts);
router.get('/:storeId/products/slug/:slug', storefrontController.getProductBySlug);
router.get('/:storeId/products/slug/:slug/related', storefrontController.relatedProducts);
router.get(
  '/:storeId/products/slug/:slug/reviews',
  optionalJWT,
  storefrontController.listProductReviews
);
router.post(
  '/:storeId/products/slug/:slug/reviews',
  verifyJWT,
  requireStoreCustomer,
  validate(storefrontValidation.createReview),
  storefrontController.createProductReview
);
router.get('/:storeId/categories', storefrontController.listCategories);

router.post(
  '/:storeId/coupons/validate',
  validate(storefrontValidation.validateCoupon),
  storefrontController.validateCoupon
);

router.post(
  '/:storeId/track-order',
  validate(storefrontValidation.trackOrder),
  storefrontController.trackOrder
);

router.post(
  '/:storeId/auth/register',
  validate(storefrontValidation.register),
  storefrontController.register
);
router.post(
  '/:storeId/auth/login',
  validate(storefrontValidation.login),
  storefrontController.login
);
router.post('/:storeId/auth/logout', storefrontController.logout);
router.post('/:storeId/auth/refresh', storefrontController.refresh);

router.get(
  '/:storeId/cart',
  verifyJWT,
  requireStoreCustomer,
  storefrontController.getCart
);
router.put(
  '/:storeId/cart',
  verifyJWT,
  requireStoreCustomer,
  validate(storefrontValidation.putCart),
  storefrontController.putCart
);

router.get(
  '/:storeId/wishlist',
  verifyJWT,
  requireStoreCustomer,
  storefrontController.getWishlist
);
router.put(
  '/:storeId/wishlist',
  verifyJWT,
  requireStoreCustomer,
  validate(storefrontValidation.putWishlist),
  storefrontController.putWishlist
);

router.get(
  '/:storeId/addresses',
  verifyJWT,
  requireStoreCustomer,
  storefrontController.listAddresses
);
router.post(
  '/:storeId/addresses',
  verifyJWT,
  requireStoreCustomer,
  validate(storefrontValidation.address),
  storefrontController.createAddress
);
router.patch(
  '/:storeId/addresses/:id',
  verifyJWT,
  requireStoreCustomer,
  validate(storefrontValidation.addressUpdate),
  storefrontController.updateAddress
);
router.delete(
  '/:storeId/addresses/:id',
  verifyJWT,
  requireStoreCustomer,
  storefrontController.deleteAddress
);

router.post(
  '/:storeId/orders',
  verifyJWT,
  requireStoreCustomer,
  validate(storefrontValidation.placeOrder),
  storefrontController.placeOrder
);
router.get(
  '/:storeId/orders',
  verifyJWT,
  requireStoreCustomer,
  storefrontController.listOrders
);
router.get(
  '/:storeId/orders/:id/receipt',
  verifyJWT,
  requireStoreCustomer,
  storefrontController.getReceipt
);
router.get(
  '/:storeId/orders/:id',
  verifyJWT,
  requireStoreCustomer,
  storefrontController.getOrder
);

module.exports = router;
