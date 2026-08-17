const Category = require('../models/Category');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { toSlug, ensureUniqueSlug } = require('../utils/slug');
const { parsePagination, buildMeta } = require('../utils/pagination');

const listCategories = async (storeId, query) => {
  const { page, limit, skip } = parsePagination(query);
  const filter = { storeId };

  if (query.parentCategoryId !== undefined && query.parentCategoryId !== '') {
    filter.parentCategoryId = query.parentCategoryId || null;
  }
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.search) {
    filter.name = { $regex: query.search, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit),
    Category.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
};

const getCategoryById = async (storeId, id) => {
  const category = await Category.findOne({ _id: id, storeId });
  if (!category) throw new AppError('Category not found', 404);
  return category;
};

const createCategory = async (storeId, payload) => {
  if (payload.parentCategoryId) {
    const parent = await Category.findOne({
      _id: payload.parentCategoryId,
      storeId,
    });
    if (!parent) throw new AppError('Parent category not found', 400);
  }

  const baseSlug = toSlug(payload.slug || payload.name);
  const slug = await ensureUniqueSlug(Category, { storeId, baseSlug });

  return Category.create({
    ...payload,
    storeId,
    slug,
    parentCategoryId: payload.parentCategoryId || null,
  });
};

const updateCategory = async (storeId, id, payload) => {
  const category = await Category.findOne({ _id: id, storeId });
  if (!category) throw new AppError('Category not found', 404);

  if (payload.parentCategoryId) {
    if (payload.parentCategoryId === id) {
      throw new AppError('Category cannot be its own parent', 400);
    }
    const parent = await Category.findOne({
      _id: payload.parentCategoryId,
      storeId,
    });
    if (!parent) throw new AppError('Parent category not found', 400);
  }

  const fields = [
    'name',
    'parentCategoryId',
    'icon',
    'imageUrl',
    'description',
    'isActive',
    'sortOrder',
  ];

  for (const key of fields) {
    if (payload[key] === undefined) continue;
    if (key === 'parentCategoryId') {
      category.parentCategoryId = payload.parentCategoryId || null;
    } else if (payload[key] === '') {
      category[key] = undefined;
    } else {
      category[key] = payload[key];
    }
  }

  if (payload.slug || payload.name) {
    const baseSlug = toSlug(payload.slug || payload.name || category.name);
    category.slug = await ensureUniqueSlug(Category, {
      storeId,
      baseSlug,
      excludeId: category._id,
    });
  }

  await category.save();
  return category;
};

const deleteCategory = async (storeId, id) => {
  const productCount = await Product.countDocuments({ storeId, categoryId: id });
  if (productCount > 0) {
    throw new AppError(
      `Cannot delete category with ${productCount} product(s). Reassign or delete them first.`,
      400
    );
  }

  const childCount = await Category.countDocuments({
    storeId,
    parentCategoryId: id,
  });
  if (childCount > 0) {
    throw new AppError('Cannot delete category with subcategories', 400);
  }

  const category = await Category.findOneAndDelete({ _id: id, storeId });
  if (!category) throw new AppError('Category not found', 404);
  return category;
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
