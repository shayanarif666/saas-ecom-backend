const Joi = require('joi');
const { objectId } = require('./authValidation');

const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  status: Joi.string()
    .valid(...REVIEW_STATUSES, 'all')
    .allow('', null),
  productId: objectId.allow('', null),
  rating: Joi.number().integer().min(1).max(5).allow('', null),
});

const idParams = Joi.object({
  id: objectId.required(),
});

const updateStatusBody = Joi.object({
  status: Joi.string()
    .valid(...REVIEW_STATUSES)
    .required(),
});

module.exports = {
  list: { query: listQuery },
  getById: { params: idParams },
  updateStatus: { params: idParams, body: updateStatusBody },
  remove: { params: idParams },
};
