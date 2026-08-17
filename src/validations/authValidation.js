const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const domainField = Joi.string().trim().min(3).max(120).required().messages({
  'any.required': 'Store domain is required',
  'string.min': 'Enter a valid domain (e.g. acadex.pk)',
});

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().trim().max(30).allow('', null),
  role: Joi.string().valid('customer', 'administrator').default('customer'),
  storeName: Joi.when('role', {
    is: 'administrator',
    then: Joi.string().trim().min(2).max(120).required(),
    otherwise: Joi.forbidden(),
  }),
  customDomain: Joi.when('role', {
    is: 'administrator',
    then: domainField,
    otherwise: Joi.forbidden(),
  }),
  domain: Joi.string().trim().max(120).allow('', null),
  storeSlug: Joi.string().trim().lowercase().max(80).allow('', null),
  businessType: Joi.string().trim().max(60).allow('', null),
});

/** Dashboard stepper: store + owner → OTP */
const registerStartSchema = Joi.object({
  storeName: Joi.string().trim().min(2).max(120).required(),
  customDomain: domainField,
  domain: Joi.string().trim().max(120).allow('', null),
  businessType: Joi.string().trim().max(60).allow('', null).default('bookstore'),
  storeSlug: Joi.string().trim().lowercase().max(80).allow('', null),
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().trim().max(30).allow('', null),
  password: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).allow('', null),
});

const registerVerifySchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  otp: Joi.string().trim().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'OTP must be a 6-digit code',
  }),
});

const registerResendSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const checkDomainSchema = Joi.object({
  domain: Joi.string().trim().min(3).max(120).required(),
  customDomain: Joi.string().trim().max(120).allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(128).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'confirmPassword must match password',
  }),
});

const resetPasswordParams = Joi.object({
  token: Joi.string().trim().min(20).required(),
});

const updateMeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120),
  phone: Joi.string().trim().max(30).allow('', null),
  password: Joi.string().min(8).max(128),
  currentPassword: Joi.when('password', {
    is: Joi.exist(),
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
}).min(1);

module.exports = {
  objectId,
  register: { body: registerSchema },
  registerStart: { body: registerStartSchema },
  registerVerify: { body: registerVerifySchema },
  registerResend: { body: registerResendSchema },
  checkDomain: { body: checkDomainSchema },
  login: { body: loginSchema },
  forgotPassword: { body: forgotPasswordSchema },
  resetPassword: {
    body: resetPasswordSchema,
    params: resetPasswordParams,
  },
  updateMe: { body: updateMeSchema },
};
