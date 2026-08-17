require('dotenv').config();

const required = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5174',
  backendPublicUrl: String(
    process.env.BACKEND_PUBLIC_URL || 'https://saas-ecom-backend-g9zg.onrender.com'
  ).replace(/\/+$/, ''),
  platformRootDomain: process.env.PLATFORM_ROOT_DOMAIN || 'localhost',
  /** Localhost storefront resolves to this customDomain (e.g. acadex.com) */
  defaultStoreDomain: process.env.DEFAULT_STORE_DOMAIN || 'acadex.com',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY,
    from: process.env.EMAIL_FROM || process.env.SENDER_EMAIL,
    fromName: process.env.EMAIL_FROM_NAME || 'BookVerse',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },
};
