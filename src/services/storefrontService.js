const Store = require('../models/Store');
const productService = require('./productService');
const categoryService = require('./categoryService');
const AppError = require('../utils/AppError');
const { normalizeDomain } = require('../utils/domain');
const { defaultStoreDomain } = require('../config/env');
const { findStoreByDomain } = require('./storeService');

const serializePublicStore = (store) => {
  const obj = store.toObject ? store.toObject() : { ...store };
  let banners = Array.isArray(obj.banners) ? obj.banners : [];
  if (!banners.length && Array.isArray(obj.bannerUrls)) {
    banners = obj.bannerUrls.map((imageUrl) => ({ imageUrl, categoryId: null }));
  }

  return {
    _id: obj._id,
    id: obj._id,
    name: obj.name,
    websiteTitle: obj.websiteTitle || '',
    slug: obj.slug,
    customDomain: obj.customDomain,
    businessType: obj.businessType,
    logoUrl: obj.logoUrl || null,
    faviconUrl: obj.faviconUrl || null,
    globalBannerUrl: obj.globalBannerUrl || null,
    aboutBannerUrl: obj.aboutBannerUrl || null,
    contactBannerUrl: obj.contactBannerUrl || null,
    faqBannerUrl: obj.faqBannerUrl || null,
    trackOrderBannerUrl: obj.trackOrderBannerUrl || null,
    banners: banners.map((b) => ({
      imageUrl: b.imageUrl,
      categoryId: b.categoryId?._id || b.categoryId || null,
      category: b.categoryId?.name
        ? { _id: b.categoryId._id, name: b.categoryId.name, slug: b.categoryId.slug }
        : null,
    })),
    bannerUrls: banners.map((b) => b.imageUrl),
    themeColors: obj.themeColors || {},
    websiteContent: (() => {
      const wc = obj.websiteContent || {};
      const collections = Array.isArray(wc.collections) ? wc.collections : [];
      return {
        ...(typeof wc.toObject === 'function' ? wc.toObject() : wc),
        collections: collections.map((c) => ({
          _id: c._id,
          title: c.title,
          description: c.description || '',
          imageUrl: c.imageUrl,
          categoryId: c.categoryId?._id || c.categoryId || null,
          categorySlug: c.categoryId?.slug || null,
          categoryName: c.categoryId?.name || null,
        })),
      };
    })(),
    contactEmail: obj.contactEmail,
    contactPhone: obj.contactPhone,
    address: obj.address,
    socialLinks:
      obj.socialLinks instanceof Map
        ? Object.fromEntries(obj.socialLinks)
        : obj.socialLinks || {},
    shipping: obj.shipping || { flatFee: 0, freeOverAmount: null },
    isLive: Boolean(obj.isLive),
    isActive: obj.isActive !== false,
    onboardingCompleted: Boolean(obj.onboardingCompleted),
  };
};

const resolveStoreByDomain = async (rawDomain) => {
  let domain = String(rawDomain || '').trim();
  if (!domain || domain === 'localhost' || domain === '127.0.0.1') {
    domain = defaultStoreDomain;
  }
  domain = normalizeDomain(domain);
  if (domain === 'localhost') domain = normalizeDomain(defaultStoreDomain);

  const store = await findStoreByDomain(domain);
  if (!store) {
    throw new AppError(`No store found for domain "${domain}"`, 404);
  }

  return serializePublicStore(store);
};

const collectCategoryAndDescendantIds = async (storeId, slugSource) => {
  const slugs = String(slugSource || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!slugs.length) return [];

  const Category = require('../models/Category');
  const all = await Category.find({ storeId }).select('_id slug parentCategoryId').lean();
  const bySlug = new Map(all.map((c) => [c.slug, c]));
  const childrenOf = new Map();
  all.forEach((c) => {
    const pid = c.parentCategoryId ? String(c.parentCategoryId) : null;
    if (!pid) return;
    if (!childrenOf.has(pid)) childrenOf.set(pid, []);
    childrenOf.get(pid).push(c);
  });

  const ids = new Set();
  const walk = (cat) => {
    if (!cat) return;
    ids.add(String(cat._id));
    (childrenOf.get(String(cat._id)) || []).forEach(walk);
  };
  slugs.forEach((slug) => walk(bySlug.get(slug)));
  return [...ids];
};

const listPublicProducts = async (storeId, query = {}) => {
  const q = {
    isPublished: true,
    limit: query.limit || query.pageSize || 12,
    page: query.page || 1,
    sort: query.sort || 'newest',
    search: query.search || query.q || undefined,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    rating: query.rating,
    categoryId: query.categoryId || undefined,
  };

  const slugSource = query.category || query.categorySlug;
  if (slugSource) {
    q.categoryIds = await collectCategoryAndDescendantIds(storeId, slugSource);
    delete q.categoryId;
  }

  return productService.listProducts(storeId, q);
};

const getPublicProductBySlug = async (storeId, slug) => {
  const product = await productService.getProductBySlug(storeId, slug);
  if (!product.isPublished) throw new AppError('Product not found', 404);
  return product;
};

const listPublicCategories = async (storeId, query = {}) => {
  return categoryService.listCategories(storeId, {
    ...query,
    isActive: true,
    limit: query.limit || 100,
  });
};

const getRelatedProducts = async (storeId, product, limit = 8) => {
  const Product = require('../models/Product');
  const items = await Product.find({
    storeId,
    isPublished: true,
    _id: { $ne: product._id },
    categoryId: product.categoryId?._id || product.categoryId,
  })
    .sort({ soldCount: -1 })
    .limit(limit)
    .populate('categoryId', 'name slug');
  return items;
};

module.exports = {
  serializePublicStore,
  resolveStoreByDomain,
  listPublicProducts,
  getPublicProductBySlug,
  listPublicCategories,
  getRelatedProducts,
};
