const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Store = require('../models/Store');
const PasswordResetToken = require('../models/PasswordResetToken');
const RegistrationOtp = require('../models/RegistrationOtp');
const AppError = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  compareTokenHash,
  createPasswordResetToken,
  hashPasswordResetToken,
  REFRESH_COOKIE,
} = require('../utils/tokens');
const { toSlug, ensureUniqueStoreSlug } = require('../utils/slug');
const { sendEmail, sendOTPEmail } = require('../utils/email');
const { normalizeDomain } = require('../utils/domain');
const { dashboardUrl, frontendUrl, nodeEnv } = require('../config/env');

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.__v;
  return obj;
};

const buildTokenPayload = (user) => ({
  sub: user._id.toString(),
  role: user.role,
  storeId: user.storeId ? user.storeId.toString() : null,
});

const issueAuthTokens = async (user) => {
  const payload = buildTokenPayload(user);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();
  return { accessToken, refreshToken, user: sanitizeUser(user) };
};

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const assertDomainAvailable = async (customDomain, excludeStoreId = null) => {
  const filter = { customDomain };
  if (excludeStoreId) filter._id = { $ne: excludeStoreId };
  const exists = await Store.exists(filter);
  if (exists) {
    throw new AppError('This domain is already registered to another store', 409);
  }
};

const createStoreForAdmin = async ({
  user,
  storeName,
  customDomain,
  businessType,
  storeSlug,
  email,
  phone,
  session,
}) => {
  const baseSlug = toSlug(storeSlug || storeName, { fallback: 'store' });
  const slug = await ensureUniqueStoreSlug(Store, { baseSlug });

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const [store] = await Store.create(
    [
      {
        name: storeName,
        slug,
        customDomain,
        businessType: businessType || 'bookstore',
        ownerId: user._id,
        contactEmail: email.toLowerCase(),
        contactPhone: phone || undefined,
        subscriptionStatus: 'trial',
        subscriptionExpiresAt: trialEnds,
        onboardingCompleted: true,
        isLive: true,
        isActive: true,
        websiteContent: {
          homepageHeadline: `Welcome to ${storeName}`,
          homepageSubheadline: 'Browse our latest books & more',
          aboutTitle: `About ${storeName}`,
          contactTitle: 'Contact Us',
          footerText: `© ${new Date().getFullYear()} ${storeName}`,
          features: require('../constants/homepageFeatures').DEFAULT_HOMEPAGE_FEATURES,
        },
      },
    ],
    { session }
  );

  return store;
};

/**
 * Legacy one-shot register (customers, or admins without OTP).
 * Dashboard admin flow should use startRegistration + verifyRegistrationOtp.
 */
const register = async ({
  name,
  email,
  password,
  phone,
  role = 'customer',
  storeName,
  storeSlug,
  businessType,
  customDomain,
}) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await hashPassword(password);

  if (role === 'administrator') {
    if (!storeName) throw new AppError('Store name is required', 400);
    if (!customDomain) throw new AppError('Store domain is required', 400);

    const domain = normalizeDomain(customDomain);
    await assertDomainAvailable(domain);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const [user] = await User.create(
        [
          {
            name,
            email: email.toLowerCase(),
            phone: phone || undefined,
            passwordHash,
            role: 'administrator',
            isVerified: true,
          },
        ],
        { session }
      );

      const store = await createStoreForAdmin({
        user,
        storeName,
        customDomain: domain,
        businessType,
        storeSlug,
        email,
        phone,
        session,
      });

      user.storeId = store._id;
      await user.save({ session });

      await session.commitTransaction();
      session.endSession();

      const tokens = await issueAuthTokens(user);
      return { ...tokens, store };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone: phone || undefined,
    passwordHash,
    role: 'customer',
  });

  return issueAuthTokens(user);
};

const checkDomainAvailability = async (rawDomain) => {
  let domain;
  try {
    domain = normalizeDomain(rawDomain);
  } catch (err) {
    throw new AppError(err.message, err.statusCode || 400);
  }
  await assertDomainAvailable(domain);
  return { domain, available: true };
};

/**
 * Step 1–2 complete → send OTP (step 3).
 */
const startRegistration = async (body) => {
  const email = String(body.email || '').toLowerCase().trim();
  const storeName = String(body.storeName || '').trim();
  const name = String(body.name || '').trim();

  if (!storeName || !name || !email || !body.password) {
    throw new AppError('Store, owner, and password details are required', 400);
  }

  let customDomain;
  try {
    customDomain = normalizeDomain(body.customDomain || body.domain);
  } catch (err) {
    throw new AppError(err.message, err.statusCode || 400);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  await assertDomainAvailable(customDomain);

  const passwordHash = await hashPassword(body.password);
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await RegistrationOtp.findOneAndUpdate(
    { email },
    {
      email,
      otpHash,
      expiresAt,
      attempts: 0,
      payload: {
        name,
        phone: body.phone || undefined,
        passwordHash,
        storeName,
        customDomain,
        businessType: body.businessType || 'bookstore',
        storeSlug: body.storeSlug || undefined,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  try {
    await sendOTPEmail(email, storeName, otp, 10);
  } catch (err) {
    throw new AppError(
      err.message || 'Failed to send verification email. Check Brevo configuration.',
      502
    );
  }

  return {
    email,
    customDomain,
    expiresInMinutes: 10,
    message: 'OTP sent to your email',
    ...(nodeEnv === 'development' ? { devOtp: otp } : {}),
  };
};

const resendRegistrationOtp = async ({ email: rawEmail }) => {
  const email = String(rawEmail || '').toLowerCase().trim();
  const pending = await RegistrationOtp.findOne({ email });
  if (!pending) {
    throw new AppError('No pending registration found for this email. Start again.', 404);
  }

  if (await User.exists({ email })) {
    await RegistrationOtp.deleteOne({ email });
    throw new AppError('Email is already registered', 409);
  }

  await assertDomainAvailable(pending.payload.customDomain);

  const otp = generateOtp();
  pending.otpHash = hashOtp(otp);
  pending.expiresAt = new Date(Date.now() + OTP_TTL_MS);
  pending.attempts = 0;
  await pending.save();

  try {
    await sendOTPEmail(email, pending.payload.storeName, otp, 10);
  } catch (err) {
    throw new AppError(err.message || 'Failed to resend OTP email', 502);
  }

  return {
    email,
    expiresInMinutes: 10,
    message: 'OTP resent to your email',
    ...(nodeEnv === 'development' ? { devOtp: otp } : {}),
  };
};

const verifyRegistrationOtp = async ({ email: rawEmail, otp }) => {
  const email = String(rawEmail || '').toLowerCase().trim();
  const code = String(otp || '').trim();

  if (!/^\d{6}$/.test(code)) {
    throw new AppError('Enter the 6-digit OTP from your email', 400);
  }

  const pending = await RegistrationOtp.findOne({ email });
  if (!pending) {
    throw new AppError('No pending registration found. Please register again.', 404);
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await RegistrationOtp.deleteOne({ _id: pending._id });
    throw new AppError('OTP expired. Please request a new one.', 400);
  }

  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    await RegistrationOtp.deleteOne({ _id: pending._id });
    throw new AppError('Too many invalid attempts. Please register again.', 429);
  }

  if (hashOtp(code) !== pending.otpHash) {
    pending.attempts += 1;
    await pending.save();
    throw new AppError('Invalid OTP', 400);
  }

  if (await User.exists({ email })) {
    await RegistrationOtp.deleteOne({ _id: pending._id });
    throw new AppError('Email is already registered', 409);
  }

  await assertDomainAvailable(pending.payload.customDomain);

  const { payload } = pending;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [user] = await User.create(
      [
        {
          name: payload.name,
          email,
          phone: payload.phone || undefined,
          passwordHash: payload.passwordHash,
          role: 'administrator',
          isVerified: true,
        },
      ],
      { session }
    );

    const store = await createStoreForAdmin({
      user,
      storeName: payload.storeName,
      customDomain: payload.customDomain,
      businessType: payload.businessType,
      storeSlug: payload.storeSlug,
      email,
      phone: payload.phone,
      session,
    });

    user.storeId = store._id;
    await user.save({ session });

    await RegistrationOtp.deleteOne({ _id: pending._id }).session(session);

    await session.commitTransaction();
    session.endSession();

    const tokens = await issueAuthTokens(user);
    return { ...tokens, store };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +refreshTokenHash'
  );
  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const match = await comparePassword(password, user.passwordHash);
  if (!match) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.role === 'administrator' && !user.isVerified) {
    throw new AppError('Please verify your email before signing in', 403);
  }

  return issueAuthTokens(user);
};

const refresh = async (refreshToken) => {
  if (!refreshToken) throw new AppError('Refresh token required', 401);

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenHash');
  if (!user || !user.isActive) {
    throw new AppError('User not found', 401);
  }

  const valid = await compareTokenHash(refreshToken, user.refreshTokenHash);
  if (!valid) throw new AppError('Invalid refresh token', 401);

  // Preserve tenant scope from the refresh JWT (storefront customers).
  const storeId =
    decoded.storeId ||
    (user.storeId ? user.storeId.toString() : null);

  if (user.role === 'customer' && storeId) {
    const storefrontAuthService = require('./storefrontAuthService');
    return storefrontAuthService.issueCustomerTokens(user, storeId);
  }

  return issueAuthTokens(user);
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

const updateMe = async (userId, { name, phone, password, currentPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404);

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone || undefined;

  if (password) {
    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) throw new AppError('Current password is incorrect', 400);
    user.passwordHash = await hashPassword(password);
  }

  await user.save();
  return sanitizeUser(user);
};

const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { message: 'If that email exists, a reset link has been sent' };
  }

  await PasswordResetToken.deleteMany({ userId: user._id });

  const { raw, hash } = createPasswordResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hash,
    expiresAt,
  });

  const base = user.role === 'customer' ? frontendUrl : dashboardUrl;
  const resetUrl = `${base}/reset-password/${raw}`;

  await sendEmail({
    to: user.email,
    subject: 'Password reset request',
    text: `Reset your password using this link (valid 1 hour): ${resetUrl}`,
    html: `<p>Reset your password using this link (valid 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  return { message: 'If that email exists, a reset link has been sent' };
};

const resetPassword = async ({ token, password }) => {
  const tokenHash = hashPasswordResetToken(token);
  const record = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!record) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const user = await User.findById(record.userId).select('+passwordHash');
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404);
  }

  user.passwordHash = await hashPassword(password);
  user.refreshTokenHash = undefined;
  await user.save();

  record.usedAt = new Date();
  await record.save();

  return { message: 'Password reset successful' };
};

module.exports = {
  register,
  startRegistration,
  resendRegistrationOtp,
  verifyRegistrationOtp,
  checkDomainAvailability,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  sanitizeUser,
  REFRESH_COOKIE,
};
