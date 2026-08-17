const AppError = require('../utils/AppError');
const {
  ACCESS_COOKIE,
  verifyAccessToken,
} = require('../utils/tokens');
const User = require('../models/User');

const extractAccessToken = (req) => {
  // Prefer explicit Bearer from the SPA session over shared httpOnly cookies.
  // Dashboard + storefront share the same cookie name on localhost; cookie-first
  // caused "not signed in to this store" when the cookie lacked the tenant storeId.
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7).trim()
    : null;
  if (bearer) return { token: bearer, source: 'bearer' };
  const cookie = req.cookies?.[ACCESS_COOKIE] || null;
  return cookie ? { token: cookie, source: 'cookie' } : { token: null, source: null };
};

const attachUserFromToken = async (token) => {
  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.sub).select(
    '_id name email role storeId isActive isVerified'
  );

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  const jwtStoreId = decoded.storeId ? String(decoded.storeId) : null;
  const userStoreId = user.storeId ? user.storeId.toString() : null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    // Prefer storeId from JWT (storefront customer sessions are store-scoped)
    storeId: jwtStoreId || userStoreId || null,
    isVerified: user.isVerified,
  };
};

const isJwtError = (err) =>
  err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError';

const verifyJWT = async (req, _res, next) => {
  try {
    const { token: primary, source } = extractAccessToken(req);

    if (!primary) {
      throw new AppError('Authentication required', 401);
    }

    try {
      req.user = await attachUserFromToken(primary);
    } catch (err) {
      // Expired/invalid Bearer: fall back to cookie when it is a different token.
      const cookie = req.cookies?.[ACCESS_COOKIE] || null;
      if (
        source === 'bearer' &&
        cookie &&
        cookie !== primary &&
        isJwtError(err)
      ) {
        try {
          req.user = await attachUserFromToken(cookie);
        } catch {
          throw new AppError('Invalid or expired access token', 401);
        }
      } else if (isJwtError(err)) {
        throw new AppError('Invalid or expired access token', 401);
      } else {
        throw err;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Attach user when a valid access token is present; otherwise continue.
 */
const optionalJWT = async (req, _res, next) => {
  try {
    const { token } = extractAccessToken(req);

    if (token) {
      try {
        req.user = await attachUserFromToken(token);
      } catch {
        const cookie = req.cookies?.[ACCESS_COOKIE] || null;
        if (cookie && cookie !== token) {
          try {
            req.user = await attachUserFromToken(cookie);
          } catch {
            req.user = undefined;
          }
        } else {
          req.user = undefined;
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = verifyJWT;
module.exports.optionalJWT = optionalJWT;
module.exports.extractAccessToken = extractAccessToken;
