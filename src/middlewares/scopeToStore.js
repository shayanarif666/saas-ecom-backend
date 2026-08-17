const AppError = require('../utils/AppError');

/**
 * Force administrators to their own storeId.
 * Superadmin may optionally pass storeId via query/body/params.
 * Sets req.storeId for downstream handlers.
 */
const scopeToStore = (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (req.user.role === 'administrator') {
    if (!req.user.storeId) {
      return next(new AppError('Administrator is not linked to a store', 403));
    }
    req.storeId = req.user.storeId;
    return next();
  }

  if (req.user.role === 'superadmin') {
    const fromRequest =
      req.params.storeId ||
      req.query.storeId ||
      req.body?.storeId ||
      null;
    req.storeId = fromRequest || null;
    return next();
  }

  return next(new AppError('Store scope is not available for this role', 403));
};

/**
 * Require a resolved storeId (admin always has one; superadmin must supply).
 */
const requireStoreId = (req, _res, next) => {
  if (!req.storeId) {
    return next(new AppError('storeId is required', 400));
  }
  return next();
};

module.exports = scopeToStore;
module.exports.requireStoreId = requireStoreId;
