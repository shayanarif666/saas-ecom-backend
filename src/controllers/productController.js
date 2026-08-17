const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const productService = require('../services/productService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await productService.listProducts(req.storeId, req.query);
  return successResponse(res, {
    message: 'Products fetched',
    data: { products: items },
    meta,
  });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.storeId, req.params.id);
  return successResponse(res, {
    message: 'Product fetched',
    data: { product },
  });
});

const getBySlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.storeId, req.params.slug);
  return successResponse(res, {
    message: 'Product fetched',
    data: { product },
  });
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.storeId, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Product created',
    data: { product },
  });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(
    req.storeId,
    req.params.id,
    req.body
  );
  return successResponse(res, {
    message: 'Product updated',
    data: { product },
  });
});

const remove = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.storeId, req.params.id);
  return successResponse(res, {
    message: 'Product deleted',
    data: null,
  });
});

module.exports = { list, getById, getBySlug, create, update, remove };
