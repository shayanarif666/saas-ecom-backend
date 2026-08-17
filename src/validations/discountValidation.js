const Joi = require('joi');
const { objectId } = require('./authValidation');

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  isActive: Joi.boolean(),
  type: Joi.string().valid('percentage', 'fixed').allow('', null),
});

const idParams = Joi.object({
  id: objectId.required(),
});

const createDiscount = Joi.object({
  code: Joi.string().trim().uppercase().min(2).max(40).required(),
  type: Joi.string().valid('percentage', 'fixed').required(),
  value: Joi.number().min(0).required(),
  applicableProductIds: Joi.array().items(objectId).default([]),
  applicableCategoryIds: Joi.array().items(objectId).default([]),
  minOrderAmount: Joi.number().min(0).default(0),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  usageLimit: Joi.number().integer().min(0).allow(null),
  isActive: Joi.boolean().default(true),
}).custom((value, helpers) => {
  if (value.type === 'percentage' && value.value > 100) {
    return helpers.message('Percentage discount cannot exceed 100');
  }
  return value;
});

const updateDiscount = createDiscount.fork(
  ['code', 'type', 'value', 'startDate', 'endDate'],
  (s) => s.optional()
).min(1);

const validateCodeBody = Joi.object({
  code: Joi.string().trim().uppercase().min(2).max(40).required(),
  orderSubtotal: Joi.number().min(0),
  subtotal: Joi.number().min(0),
}).custom((value) => {
  if (value.orderSubtotal == null && value.subtotal != null) {
    value.orderSubtotal = value.subtotal;
  }
  if (value.orderSubtotal == null) value.orderSubtotal = 0;
  return value;
});

module.exports = {
  list: { query: listQuery },
  getById: { params: idParams },
  create: { body: createDiscount },
  update: { params: idParams, body: updateDiscount },
  remove: { params: idParams },
  validateCode: { body: validateCodeBody },
};
