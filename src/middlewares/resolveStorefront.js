const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const storeService = require('../services/storeService');
const { normalizeDomain } = require('../utils/domain');
const { defaultStoreDomain } = require('../config/env');

/**
 * Resolve tenant store for public storefront routes.
 * Accepts:
 *  - ?domain=acadex.com
 *  - X-Store-Domain header
 *  - Host / X-Forwarded-Host (when not localhost)
 * Localhost / 127.0.0.1 fall back to DEFAULT_STORE_DOMAIN (acadex.com).
 */
const resolveDomainFromRequest = (req) => {
  const fromQuery = req.query?.domain;
  const fromHeader = req.headers['x-store-domain'];
  if (fromQuery) return String(fromQuery);
  if (fromHeader) return String(fromHeader);

  const hostRaw = req.headers.host || '';
  const host = String(hostRaw).split(',')[0].trim().toLowerCase();
  const hostname = host.replace(/:\d+$/, '');

  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost')
  ) {
    return defaultStoreDomain;
  }

  return hostname;
};

const attachStore = async (req, _res, next) => {
  try {
    const raw = resolveDomainFromRequest(req);
    let domain;
    try {
      domain = normalizeDomain(raw);
    } catch (err) {
      throw new AppError(err.message || 'Invalid domain', err.statusCode || 400);
    }

    // Map bare localhost to configured default store domain
    if (domain === 'localhost') {
      domain = normalizeDomain(defaultStoreDomain);
    }

    const store = await storeService.findStoreByDomain(domain);
    if (!store) {
      throw new AppError(`No store found for domain "${domain}"`, 404);
    }

    req.store = store;
    req.storeId = store._id.toString();
    req.storeDomain = domain;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Ensure :storeId path param matches an active store (after resolve, or standalone).
 */
const requireStoreParam = async (req, _res, next) => {
  try {
    const { storeId } = req.params;
    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      throw new AppError('Invalid store id', 400);
    }

    if (req.storeId && req.storeId === storeId) {
      return next();
    }

    const Store = require('../models/Store');
    // Catalog routes only need tenant identity — never load logo/banners (can be multi-MB)
    const store = await Store.findOne({ _id: storeId, isActive: true })
      .select('_id name slug customDomain isActive isLive')
      .lean();
    if (!store) throw new AppError('Store not found', 404);

    req.store = store;
    req.storeId = store._id.toString();
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Customer JWT must belong to this storefront's storeId.
 * Falls back to StoreCustomer membership when JWT storeId is missing
 * (e.g. tokens issued via dashboard refresh for multi-store customers).
 */
const requireStoreCustomer = async (req, _res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    if (req.user.role !== 'customer') {
      throw new AppError('Customer access only', 403);
    }

    const routeStoreId = String(req.storeId || '');
    const jwtStoreId = req.user.storeId ? String(req.user.storeId) : null;

    if (jwtStoreId && jwtStoreId === routeStoreId) {
      return next();
    }

    const StoreCustomer = require('../models/StoreCustomer');
    const link = await StoreCustomer.findOne({
      storeId: routeStoreId,
      userId: req.user.id,
    })
      .select('_id')
      .lean();

    if (!link) {
      throw new AppError('You are not signed in to this store', 403);
    }

    req.user.storeId = routeStoreId;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  attachStore,
  requireStoreParam,
  requireStoreCustomer,
  resolveDomainFromRequest,
};
