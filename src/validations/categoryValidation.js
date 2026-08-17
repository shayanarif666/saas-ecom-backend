const Joi = require('joi');
const { objectId } = require('./authValidation');
const { CATEGORY_ICON_KEYS } = require('../constants/categoryIcons');

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  parentCategoryId: objectId.allow(null, ''),
  isActive: Joi.boolean(),
  search: Joi.string().trim().allow('', null),
});

const idParams = Joi.object({
  id: objectId.required(),
});

const createCategory = Joi.object({
  name: Joi.string().trim().min(1).max(120).required(),
  slug: Joi.string().trim().lowercase().max(140).allow('', null),
  parentCategoryId: objectId.allow(null, ''),
  icon: Joi.string()
    .trim()
    .valid(...CATEGORY_ICON_KEYS)
    .default('layers'),
  imageUrl: Joi.string()
    .trim()
    .allow('', null)
    .custom((value, helpers) => {
      if (!value) return value;
      if (
        value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('data:image/')
      ) {
        return value;
      }
      return helpers.error('string.uri');
    }),
  description: Joi.string().trim().max(2000).allow('', null),
  isActive: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().default(0),
});

const updateCategory = createCategory.fork(['name'], (s) => s.optional()).min(1);

module.exports = {
  list: { query: listQuery },
  getById: { params: idParams },
  create: { body: createCategory },
  update: { params: idParams, body: updateCategory },
  remove: { params: idParams },
};
