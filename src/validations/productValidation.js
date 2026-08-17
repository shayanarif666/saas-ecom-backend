const Joi = require('joi');
const { objectId } = require('./authValidation');

const imageUrl = Joi.string()
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
  });

const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null),
  categoryId: objectId.allow('', null),
  isPublished: Joi.boolean(),
  lowStock: Joi.boolean(),
  stockStatus: Joi.string().valid('in', 'low', 'out').allow('', null),
  sort: Joi.string()
    .valid(
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'title',
      'stock',
      'bestselling',
      'rating',
      'discount'
    )
    .default('newest'),
  minPrice: Joi.number().min(0).allow('', null),
  maxPrice: Joi.number().min(0).allow('', null),
  rating: Joi.number().min(0).max(5).allow('', null),
  category: Joi.string().trim().allow('', null),
  categorySlug: Joi.string().trim().allow('', null),
});

const idParams = Joi.object({
  id: objectId.required(),
});

const slugParams = Joi.object({
  slug: Joi.string().trim().lowercase().required(),
});

const specification = Joi.object({
  key: Joi.string().trim().required(),
  value: Joi.string().trim().required(),
});

const keyHighlight = Joi.string().trim().min(2).max(200);

const createProduct = Joi.object({
  categoryId: objectId.required(),
  title: Joi.string().trim().min(1).max(200).required(),
  slug: Joi.string().trim().lowercase().max(220).allow('', null),
  sku: Joi.string().trim().uppercase().max(60).required(),
  description: Joi.string().trim().max(100000).allow('', null),
  images: Joi.array().items(imageUrl).default([]),
  price: Joi.number().min(0).required(),
  discountPrice: Joi.number().min(0).allow(null),
  currency: Joi.string().trim().default('PKR'),
  stockQuantity: Joi.number().integer().min(0).default(0),
  lowStockThreshold: Joi.number().integer().min(0).default(5),
  isPublished: Joi.boolean().default(false),
  specifications: Joi.array().items(specification).default([]),
  quickFacts: Joi.array().items(specification).default([]),
  keyHighlights: Joi.array().items(keyHighlight).min(2).max(4).required(),
  author: Joi.string().trim().max(120).allow('', null),
  publisher: Joi.string().trim().max(120).allow('', null),
  language: Joi.string().trim().max(60).allow('', null),
  isbn: Joi.string().trim().max(40).allow('', null),
});

const updateProduct = createProduct
  .fork(['categoryId', 'title', 'sku', 'price', 'keyHighlights'], (schema) =>
    schema.optional()
  )
  .keys({
    keyHighlights: Joi.array().items(keyHighlight).min(2).max(4),
  })
  .min(1);

module.exports = {
  list: { query: listQuery },
  getById: { params: idParams },
  getBySlug: { params: slugParams },
  create: { body: createProduct },
  update: { params: idParams, body: updateProduct },
  remove: { params: idParams },
};
