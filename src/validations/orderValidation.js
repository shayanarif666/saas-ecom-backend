const Joi = require('joi');
const Order = require('../models/Order');

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  orderStatus: Joi.string()
    .valid(...Order.ORDER_STATUSES)
    .allow('', null),
  paymentStatus: Joi.string()
    .valid(...Order.PAYMENT_STATUSES)
    .allow('', null),
  paymentMethod: Joi.string()
    .valid(...Order.PAYMENT_METHODS)
    .allow('', null),
  from: Joi.date().iso().allow('', null),
  to: Joi.date().iso().allow('', null),
  sort: Joi.string()
    .valid('newest', 'oldest', 'total_desc', 'total_asc')
    .default('newest'),
});

const idParams = Joi.object({
  // Mongo ObjectId or orderNumber
  id: Joi.string().trim().min(1).max(80).required(),
});

const updateStatus = Joi.object({
  orderStatus: Joi.string()
    .valid(...Order.ORDER_STATUSES)
    .required(),
  note: Joi.string().trim().max(500).allow('', null),
  location: Joi.string().trim().max(200).allow('', null),
  trackingNumber: Joi.string().trim().max(120).allow('', null),
  carrier: Joi.string().trim().max(120).allow('', null),
  trackingUrl: Joi.string().uri().allow('', null),
});

const updatePaymentStatus = Joi.object({
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed').required(),
});

const refundBody = Joi.object({
  amount: Joi.number().min(0).required(),
  reason: Joi.string().trim().min(3).max(500).required(),
});

module.exports = {
  list: { query: listQuery },
  getById: { params: idParams },
  updateStatus: { params: idParams, body: updateStatus },
  updatePaymentStatus: { params: idParams, body: updatePaymentStatus },
  refund: { params: idParams, body: refundBody },
};
