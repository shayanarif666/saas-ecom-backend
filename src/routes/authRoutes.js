const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middlewares/validate');
const authValidation = require('../validations/authValidation');
const verifyJWT = require('../middlewares/verifyJWT');
const { optionalJWT } = require('../middlewares/verifyJWT');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  validate(authValidation.register),
  authController.register
);

router.post(
  '/register/check-domain',
  authLimiter,
  validate(authValidation.checkDomain),
  authController.checkDomain
);

router.post(
  '/register/start',
  authLimiter,
  validate(authValidation.registerStart),
  authController.registerStart
);

router.post(
  '/register/resend-otp',
  authLimiter,
  validate(authValidation.registerResend),
  authController.registerResendOtp
);

router.post(
  '/register/verify',
  authLimiter,
  validate(authValidation.registerVerify),
  authController.registerVerify
);

router.post(
  '/login',
  authLimiter,
  validate(authValidation.login),
  authController.login
);

router.post('/refresh', authLimiter, authController.refresh);

router.post('/logout', optionalJWT, authController.logout);

router.post(
  '/forgot-password',
  authLimiter,
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);

router.post(
  '/reset-password/:token',
  authLimiter,
  validate(authValidation.resetPassword),
  authController.resetPassword
);

router.get('/me', verifyJWT, authController.getMe);

router.patch(
  '/me',
  verifyJWT,
  validate(authValidation.updateMe),
  authController.updateMe
);

module.exports = router;
