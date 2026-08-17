const AppError = require('../utils/AppError');

/**
 * Restrict route to one or more roles.
 * Usage: authorizeRoles('administrator', 'superadmin')
 */
const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  return next();
};

module.exports = authorizeRoles;
