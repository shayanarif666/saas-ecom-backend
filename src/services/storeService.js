const Store = require('../models/Store');
// Register ref model so populate('subscriptionPlanId') works
require('../models/SubscriptionPlan');
require('../models/Category');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const { normalizeDomain } = require('../utils/domain');

const SENSITIVE_PATHS = [
  '-paymentCredentials.jazzcash.password',
  '-paymentCredentials.jazzcash.integritySalt',
  '-paymentCredentials.easypaisa.hashKey',
].join(' ');

const normalizeBanners = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return { imageUrl: item, categoryId: null };
      }
      if (item && item.imageUrl) {
        return {
          imageUrl: String(item.imageUrl).trim(),
          categoryId: item.categoryId || null,
          _id: item._id,
        };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 10);
};

const serializeStore = (store) => {
  const obj = store.toObject ? store.toObject() : { ...store };
  let banners = normalizeBanners(obj.banners);
  if (!banners.length && Array.isArray(obj.bannerUrls) && obj.bannerUrls.length) {
    banners = normalizeBanners(obj.bannerUrls);
  }
  obj.banners = banners;
  // Keep bannerUrls in sync for older clients
  obj.bannerUrls = banners.map((b) => b.imageUrl);
  return obj;
};

const getMyStore = async (storeId) => {
  const store = await Store.findById(storeId)
    .select(SENSITIVE_PATHS)
    .populate('subscriptionPlanId', 'name price billingCycle maxProducts features')
    .populate('banners.categoryId', 'name slug')
    .populate('websiteContent.collections.categoryId', 'name slug');

  if (!store) throw new AppError('Store not found', 404);
  return serializeStore(store);
};

const updateMyStore = async (storeId, payload) => {
  const store = await Store.findById(storeId);
  if (!store) throw new AppError('Store not found', 404);

  if (payload.customDomain !== undefined && payload.customDomain !== '') {
    let domain;
    try {
      domain = normalizeDomain(payload.customDomain);
    } catch (err) {
      throw new AppError(err.message, err.statusCode || 400);
    }
    const taken = await Store.exists({
      customDomain: domain,
      _id: { $ne: storeId },
    });
    if (taken) {
      throw new AppError('This domain is already registered to another store', 409);
    }
    store.customDomain = domain;
  }

  if (payload.banners !== undefined || payload.bannerUrls !== undefined) {
    const incoming = payload.banners !== undefined ? payload.banners : payload.bannerUrls;
    const banners = normalizeBanners(incoming);

    for (const banner of banners) {
      if (!banner.categoryId) continue;
      // eslint-disable-next-line no-await-in-loop
      const cat = await Category.findOne({ _id: banner.categoryId, storeId });
      if (!cat) {
        throw new AppError('One or more banner categories were not found in this store', 400);
      }
    }

    store.banners = banners.map((b) => ({
      imageUrl: b.imageUrl,
      categoryId: b.categoryId || null,
    }));
    store.bannerUrls = banners.map((b) => b.imageUrl);
  }

  const allowed = [
    'name',
    'websiteTitle',
    'businessType',
    'logoUrl',
    'faviconUrl',
    'globalBannerUrl',
    'aboutBannerUrl',
    'contactBannerUrl',
    'faqBannerUrl',
    'trackOrderBannerUrl',
    'themeColors',
    'websiteContent',
    'contactEmail',
    'contactPhone',
    'address',
    'shipping',
    'onboardingCompleted',
    'isLive',
    'socialLinks',
  ];

  for (const key of allowed) {
    if (payload[key] === undefined) continue;
    if (key === 'themeColors' || key === 'shipping') {
      store[key] = { ...(store[key]?.toObject?.() || store[key] || {}), ...payload[key] };
    } else if (key === 'websiteContent') {
      const current = store.websiteContent?.toObject?.() || store.websiteContent || {};
      const next = { ...current, ...payload.websiteContent };
      // Arrays must replace (shallow merge would corrupt nested lists)
      if (payload.websiteContent.features !== undefined) {
        next.features = payload.websiteContent.features;
      }
      if (payload.websiteContent.faqItems !== undefined) {
        next.faqItems = payload.websiteContent.faqItems;
      }
      if (payload.websiteContent.collections !== undefined) {
        const collections = payload.websiteContent.collections;
        for (const item of collections) {
          if (!item.categoryId) continue;
          // eslint-disable-next-line no-await-in-loop
          const cat = await Category.findOne({ _id: item.categoryId, storeId });
          if (!cat) {
            throw new AppError(
              'One or more collection categories were not found in this store',
              400
            );
          }
        }
        next.collections = collections.map((c) => ({
          title: c.title,
          description: c.description || '',
          imageUrl: c.imageUrl,
          categoryId: c.categoryId || null,
        }));
      }
      store.websiteContent = next;
    } else if (key === 'socialLinks') {
      store.socialLinks = payload.socialLinks;
    } else {
      store[key] = payload[key] === '' ? undefined : payload[key];
    }
  }

  await store.save();
  return getMyStore(storeId);
};

/**
 * Resolve tenant store by Host / custom domain (for storefront later).
 */
const findStoreByDomain = async (rawDomain) => {
  let domain;
  try {
    domain = normalizeDomain(rawDomain);
  } catch {
    return null;
  }
  return Store.findOne({ customDomain: domain, isActive: true })
    .populate('banners.categoryId', 'name slug')
    .populate('websiteContent.collections.categoryId', 'name slug');
};

module.exports = { getMyStore, updateMyStore, findStoreByDomain };
