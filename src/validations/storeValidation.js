const Joi = require('joi');
const { objectId } = require('./authValidation');

const imageUrl = Joi.string()
  .trim()
  .allow('', null)
  .custom((value, helpers) => {
    if (!value) return value;
    if (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:image/')
    ) {
      return value;
    }
    return helpers.error('string.uri');
  });

const hexColor = Joi.string()
  .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  .allow('', null);

const featureItem = Joi.object({
  _id: objectId.allow('', null),
  title: Joi.string().trim().max(120).required(),
  description: Joi.string().trim().max(500).allow('', null),
  iconUrl: imageUrl,
});

const faqItem = Joi.object({
  _id: objectId.allow('', null),
  topHeading: Joi.string().trim().max(120).required(),
  mainHeading: Joi.string().trim().max(300).required(),
  body: Joi.string().trim().max(100000).allow('', null),
});

const collectionItem = Joi.object({
  _id: objectId.allow('', null),
  title: Joi.string().trim().max(120).required(),
  description: Joi.string().trim().max(500).allow('', null),
  imageUrl: imageUrl.required(),
  categoryId: objectId.allow(null, ''),
});

const websiteContentSchema = Joi.object({
  aboutTitle: Joi.string().trim().max(200).allow('', null),
  aboutBody: Joi.string().trim().max(100000).allow('', null),
  aboutMission: Joi.string().trim().max(100000).allow('', null),
  aboutVision: Joi.string().trim().max(100000).allow('', null),
  aboutTargetAudience: Joi.string().trim().max(100000).allow('', null),
  aboutProductQualities: Joi.string().trim().max(100000).allow('', null),
  contactTitle: Joi.string().trim().max(200).allow('', null),
  contactBody: Joi.string().trim().max(100000).allow('', null),
  homepageHeadline: Joi.string().trim().max(200).allow('', null),
  homepageSubheadline: Joi.string().trim().max(500).allow('', null),
  footerText: Joi.string().trim().max(1000).allow('', null),
  termsBody: Joi.string().trim().max(100000).allow('', null),
  privacyBody: Joi.string().trim().max(100000).allow('', null),
  faqBody: Joi.string().trim().max(100000).allow('', null),
  shippingBody: Joi.string().trim().max(100000).allow('', null),
  features: Joi.array().items(featureItem).max(4),
  faqItems: Joi.array().items(faqItem).max(50),
  collections: Joi.array().items(collectionItem).max(12),
}).unknown(false);

const bannerItem = Joi.alternatives().try(
  imageUrl,
  Joi.object({
    _id: objectId.allow('', null),
    imageUrl: imageUrl.required(),
    categoryId: objectId.allow(null, ''),
  })
);

const updateStoreSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  websiteTitle: Joi.string().trim().max(120).allow('', null),
  businessType: Joi.string().trim().max(60).allow('', null),
  customDomain: Joi.string().trim().min(3).max(120).allow('', null),
  logoUrl: imageUrl,
  bannerUrls: Joi.array().items(bannerItem).max(10),
  banners: Joi.array().items(bannerItem).max(10),
  faviconUrl: imageUrl,
  globalBannerUrl: imageUrl,
  aboutBannerUrl: imageUrl,
  contactBannerUrl: imageUrl,
  faqBannerUrl: imageUrl,
  trackOrderBannerUrl: imageUrl,
  themeColors: Joi.object({
    primary: hexColor,
    secondary: hexColor,
    accent: hexColor,
    buttonPrimary: hexColor,
    buttonPrimaryBg: hexColor,
    buttonPrimaryText: hexColor,
    buttonSecondary: hexColor,
    buttonTertiary: hexColor,
  }),
  websiteContent: websiteContentSchema,
  contactEmail: Joi.string().email().lowercase().trim().allow('', null),
  contactPhone: Joi.string().trim().max(30).allow('', null),
  address: Joi.string().trim().max(500).allow('', null),
  shipping: Joi.object({
    flatFee: Joi.number().min(0),
    freeOverAmount: Joi.number().min(0).allow(null),
  }),
  onboardingCompleted: Joi.boolean(),
  isLive: Joi.boolean(),
  socialLinks: Joi.object().pattern(
    Joi.string(),
    Joi.string().uri().allow('')
  ),
}).min(1);

module.exports = {
  updateStore: { body: updateStoreSchema },
};
