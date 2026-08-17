const mongoose = require('mongoose');

const themeColorsSchema = new mongoose.Schema(
  {
    primary: { type: String, trim: true },
    secondary: { type: String, trim: true },
    /** @deprecated prefer buttonPrimaryBg */
    accent: { type: String, trim: true },
    /** @deprecated prefer buttonPrimaryBg */
    buttonPrimary: { type: String, trim: true },
    /** Filled primary CTA background e.g. Shop Now */
    buttonPrimaryBg: { type: String, trim: true },
    /** Filled primary CTA text color e.g. Shop Now label */
    buttonPrimaryText: { type: String, trim: true },
    /** Outline secondary CTA border + text e.g. Contact Us */
    buttonSecondary: { type: String, trim: true },
    /** Text-only tertiary link/button e.g. See All / View All */
    buttonTertiary: { type: String, trim: true },
  },
  { _id: false }
);

const homepageFeatureSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    iconUrl: { type: String, trim: true },
  },
  { _id: true }
);

const faqItemSchema = new mongoose.Schema(
  {
    /** Section label e.g. SHIPPING */
    topHeading: { type: String, required: true, trim: true, maxlength: 120 },
    /** Question e.g. How long does delivery take? */
    mainHeading: { type: String, required: true, trim: true, maxlength: 300 },
    /** Answer body (HTML from Quill) */
    body: { type: String, trim: true, maxlength: 100000 },
  },
  { _id: true }
);

const homepageCollectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    imageUrl: { type: String, required: true, trim: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
  },
  { _id: true }
);

const jazzcashCredentialsSchema = new mongoose.Schema(
  {
    merchantId: { type: String, trim: true },
    password: { type: String },
    integritySalt: { type: String },
  },
  { _id: false }
);

const easypaisaCredentialsSchema = new mongoose.Schema(
  {
    storeId: { type: String, trim: true },
    hashKey: { type: String },
  },
  { _id: false }
);

const shippingRulesSchema = new mongoose.Schema(
  {
    flatFee: { type: Number, default: 0, min: 0 },
    freeOverAmount: { type: Number, default: null, min: 0 },
  },
  { _id: false }
);

const websiteContentSchema = new mongoose.Schema(
  {
    aboutTitle: { type: String, trim: true },
    aboutBody: { type: String, trim: true },
    aboutMission: { type: String, trim: true },
    aboutVision: { type: String, trim: true },
    aboutTargetAudience: { type: String, trim: true },
    aboutProductQualities: { type: String, trim: true },
    contactTitle: { type: String, trim: true },
    contactBody: { type: String, trim: true },
    homepageHeadline: { type: String, trim: true },
    homepageSubheadline: { type: String, trim: true },
    footerText: { type: String, trim: true },
    termsBody: { type: String, trim: true },
    privacyBody: { type: String, trim: true },
    /** @deprecated prefer faqItems */
    faqBody: { type: String, trim: true },
    shippingBody: { type: String, trim: true },
    /** Optional homepage trust/feature cards — 3 to 4 when used */
    features: { type: [homepageFeatureSchema], default: [] },
    /** Structured FAQ entries for the FAQ page */
    faqItems: { type: [faqItemSchema], default: [] },
    /** Homepage collections — banner + title + paragraph */
    collections: { type: [homepageCollectionSchema], default: [] },
  },
  { _id: false }
);

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
  },
  { _id: true }
);

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    customDomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      // Used for multi-tenant storefront routing (e.g. acadex.pk → this store's catalog/orders)
    },
    businessType: { type: String, default: 'general', trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    logoUrl: { type: String, trim: true },
    /** Browser tab / SEO title — falls back to store name when empty */
    websiteTitle: { type: String, trim: true, maxlength: 120 },
    /** @deprecated legacy string URLs — prefer `banners` */
    bannerUrls: { type: [String], default: [] },
    /** Homepage hero banners: image + linked category */
    banners: { type: [bannerSchema], default: [] },
    faviconUrl: { type: String, trim: true },
    /** Page CTA banners — required 1535×350 */
    globalBannerUrl: { type: String, trim: true },
    aboutBannerUrl: { type: String, trim: true },
    contactBannerUrl: { type: String, trim: true },
    faqBannerUrl: { type: String, trim: true },
    trackOrderBannerUrl: { type: String, trim: true },
    themeColors: { type: themeColorsSchema, default: () => ({}) },
    websiteContent: { type: websiteContentSchema, default: () => ({}) },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    socialLinks: { type: Map, of: String, default: undefined },
    paymentCredentials: {
      jazzcash: { type: jazzcashCredentialsSchema, default: () => ({}) },
      easypaisa: { type: easypaisaCredentialsSchema, default: () => ({}) },
    },
    shipping: { type: shippingRulesSchema, default: () => ({}) },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'expired', 'suspended'],
      default: 'trial',
    },
    subscriptionExpiresAt: { type: Date, default: null },
    onboardingCompleted: { type: Boolean, default: false },
    isLive: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

storeSchema.index({ ownerId: 1 });
storeSchema.index({ isLive: 1, isActive: 1 });
storeSchema.index({ subscriptionStatus: 1 });

module.exports = mongoose.model('Store', storeSchema);
