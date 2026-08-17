const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { jwt: jwtConfig, nodeEnv } = require('../config/env');

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  secure: nodeEnv === 'production',
  sameSite: nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: maxAgeMs,
  path: '/',
});

const parseDurationToMs = (value, fallbackMs) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallbackMs;
  const match = /^(\d+)([smhd])$/i.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
};

const signAccessToken = (payload) =>
  jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn,
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
  });

const verifyAccessToken = (token) =>
  jwt.verify(token, jwtConfig.accessSecret);

const verifyRefreshToken = (token) =>
  jwt.verify(token, jwtConfig.refreshSecret);

const hashToken = async (token) => bcrypt.hash(token, 10);

const compareTokenHash = async (token, hash) => {
  if (!token || !hash) return false;
  return bcrypt.compare(token, hash);
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(
    ACCESS_COOKIE,
    accessToken,
    cookieOptions(parseDurationToMs(jwtConfig.accessExpiresIn, 15 * 60_000))
  );
  res.cookie(
    REFRESH_COOKIE,
    refreshToken,
    cookieOptions(parseDurationToMs(jwtConfig.refreshExpiresIn, 7 * 86_400_000))
  );
};

const clearAuthCookies = (res) => {
  const base = {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
  };
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
};

const createPasswordResetToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
};

const hashPasswordResetToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  compareTokenHash,
  setAuthCookies,
  clearAuthCookies,
  createPasswordResetToken,
  hashPasswordResetToken,
};
