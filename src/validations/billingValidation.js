const Joi = require('joi');
const Order = require('../models/Order');

const summaryQuery = Joi.object({
  from: Joi.date().iso().allow('', null),
  to: Joi.date().iso().allow('', null),
  days: Joi.number().integer().min(1).max(365).default(30),
});

const refundsQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  from: Joi.date().iso().allow('', null),
  to: Joi.date().iso().allow('', null),
});

const transactionsQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  status: Joi.string()
    .valid(...Order.PAYMENT_STATUSES)
    .allow('', null),
  paymentMethod: Joi.string()
    .valid(...Order.PAYMENT_METHODS)
    .allow('', null),
  from: Joi.date().iso().allow('', null),
  to: Joi.date().iso().allow('', null),
  days: Joi.number().integer().min(1).max(365).allow('', null),
});

const transactionIdParams = Joi.object({
  id: Joi.string().trim().min(1).max(120).required(),
});

module.exports = {
  summary: { query: summaryQuery },
  refunds: { query: refundsQuery },
  transactions: { query: transactionsQuery },
  getTransaction: { params: transactionIdParams },
};
