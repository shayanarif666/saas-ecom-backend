const Joi = require('joi');
const { objectId } = require('./authValidation');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().trim().max(30).allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

const putCartSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: objectId.required(),
        quantity: Joi.number().integer().min(1).max(999).required(),
      })
    )
    .required(),
  couponCode: Joi.string().trim().uppercase().allow('', null),
});

const putWishlistSchema = Joi.object({
  productIds: Joi.array().items(objectId).required(),
});

const addressSchema = Joi.object({
  label: Joi.string().trim().max(60).allow('', null),
  name: Joi.string().trim().min(2).max(120).required(),
  phone: Joi.string().trim().min(7).max(30).required(),
  email: Joi.string().email().lowercase().trim().allow('', null),
  addressLine: Joi.string().trim().min(5).max(500).required(),
  city: Joi.string().trim().min(2).max(120).required(),
  postalCode: Joi.string().trim().min(3).max(20).required(),
  isDefault: Joi.boolean(),
});

const addressUpdateSchema = addressSchema.fork(
  ['name', 'phone', 'addressLine', 'city', 'postalCode'],
  (schema) => schema.optional()
);

const placeOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: objectId.required(),
        quantity: Joi.number().integer().min(1).max(999).required(),
      })
    )
    .min(1)
    .required(),
  shippingAddress: Joi.object({
    name: Joi.string().trim().required(),
    phone: Joi.string().trim().required(),
    email: Joi.string().email().lowercase().trim().required(),
    addressLine: Joi.string().trim().required(),
    city: Joi.string().trim().required(),
    postalCode: Joi.string().trim().required(),
  }).required(),
  paymentMethod: Joi.string().valid('cod', 'jazzcash', 'easypaisa').default('cod'),
  couponCode: Joi.string().trim().uppercase().allow('', null),
  customerNote: Joi.string().trim().max(1000).allow('', null),
});

const trackOrderSchema = Joi.object({
  orderNumber: Joi.string().trim().allow('', null),
  email: Joi.string().email().lowercase().trim().allow('', null),
  phone: Joi.string().trim().allow('', null),
  token: Joi.string().trim().allow('', null),
}).or('orderNumber', 'token');

const validateCouponSchema = Joi.object({
  code: Joi.string().trim(),
  couponCode: Joi.string().trim(),
  subtotal: Joi.number().min(0).default(0),
}).or('code', 'couponCode');

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().min(10).max(2000).required(),
});

module.exports = {
  register: { body: registerSchema },
  login: { body: loginSchema },
  putCart: { body: putCartSchema },
  putWishlist: { body: putWishlistSchema },
  address: { body: addressSchema },
  addressUpdate: { body: addressUpdateSchema },
  placeOrder: { body: placeOrderSchema },
  trackOrder: { body: trackOrderSchema },
  validateCoupon: { body: validateCouponSchema },
  createReview: { body: createReviewSchema },
};
