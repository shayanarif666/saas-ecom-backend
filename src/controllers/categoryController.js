const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const categoryService = require('../services/categoryService');

const list = asyncHandler(async (req, res) => {
  const { items, meta } = await categoryService.listCategories(
    req.storeId,
    req.query
  );
  return successResponse(res, {
    message: 'Categories fetched',
    data: { categories: items },
    meta,
  });
});

const getById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(
    req.storeId,
    req.params.id
  );
  return successResponse(res, {
    message: 'Category fetched',
    data: { category },
  });
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.storeId, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Category created',
    data: { category },
  });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(
    req.storeId,
    req.params.id,
    req.body
  );
  return successResponse(res, {
    message: 'Category updated',
    data: { category },
  });
});

const remove = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.storeId, req.params.id);
  return successResponse(res, {
    message: 'Category deleted',
    data: null,
  });
});

module.exports = { list, getById, create, update, remove };
