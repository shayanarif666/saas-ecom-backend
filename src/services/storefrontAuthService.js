const User = require('../models/User');
const StoreCustomer = require('../models/StoreCustomer');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  hashToken,
  verifyRefreshToken,
  compareTokenHash,
} = require('../utils/tokens');

const sanitizeUser = (user, storeId) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.__v;
  delete obj.addresses;
  return {
    ...obj,
    id: obj._id,
    storeId: storeId || (obj.storeId ? String(obj.storeId) : null),
  };
};

const issueCustomerTokens = async (user, storeId) => {
  const payload = {
    sub: user._id.toString(),
    role: 'customer',
    storeId: String(storeId),
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();
  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user, storeId),
  };
};

const ensureStoreCustomer = async (storeId, userId) => {
  await StoreCustomer.findOneAndUpdate(
    { storeId, userId },
    { $setOnInsert: { storeId, userId } },
    { upsert: true, new: true }
  );
};

const registerCustomer = async (storeId, { name, email, password, phone }) => {
  const normalizedEmail = String(email).toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordHash +refreshTokenHash'
  );

  if (user) {
    if (user.role !== 'customer') {
      throw new AppError('This email is already registered with another role', 409);
    }
    const match = await comparePassword(password, user.passwordHash);
    if (!match) {
      throw new AppError(
        'An account with this email already exists. Please sign in instead.',
        409
      );
    }
  } else {
    user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: phone || undefined,
      passwordHash: await hashPassword(password),
      role: 'customer',
      isVerified: true,
      storeId: null,
    });
  }

  await ensureStoreCustomer(storeId, user._id);
  return issueCustomerTokens(user, storeId);
};

const loginCustomer = async (storeId, { email, password }) => {
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    '+passwordHash +refreshTokenHash'
  );
  if (!user || !user.isActive || user.role !== 'customer') {
    throw new AppError('Invalid email or password', 401);
  }

  const match = await comparePassword(password, user.passwordHash);
  if (!match) throw new AppError('Invalid email or password', 401);

  await ensureStoreCustomer(storeId, user._id);
  return issueCustomerTokens(user, storeId);
};

/**
 * Re-issue customer tokens for a store using the httpOnly refresh cookie.
 * Always stamps JWT storeId from the route so multi-tenant APIs keep working.
 */
const refreshCustomer = async (storeId, refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token required', 401);

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.isActive || user.role !== 'customer') {
    throw new AppError('User not found', 401);
  }

  const valid = await compareTokenHash(refreshToken, user.refreshTokenHash);
  if (!valid) throw new AppError('Invalid refresh token', 401);

  await ensureStoreCustomer(storeId, user._id);
  return issueCustomerTokens(user, storeId);
};

module.exports = {
  registerCustomer,
  loginCustomer,
  refreshCustomer,
  issueCustomerTokens,
  ensureStoreCustomer,
  sanitizeUser,
};
