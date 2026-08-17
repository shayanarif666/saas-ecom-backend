const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');
const authService = require('../services/authService');
const {
  setAuthCookies,
  clearAuthCookies,
  REFRESH_COOKIE,
} = require('../utils/tokens');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  const data = { user: result.user };
  if (result.store) data.store = result.store;

  return successResponse(res, {
    statusCode: 201,
    message: 'Registered successfully',
    data,
  });
});

/** Stepper: store + owner → send OTP */
const registerStart = asyncHandler(async (req, res) => {
  const result = await authService.startRegistration(req.body);
  return successResponse(res, {
    message: result.message,
    data: result,
  });
});

const registerResendOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendRegistrationOtp(req.body);
  return successResponse(res, {
    message: result.message,
    data: result,
  });
});

const registerVerify = asyncHandler(async (req, res) => {
  const result = await authService.verifyRegistrationOtp(req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  return successResponse(res, {
    statusCode: 201,
    message: 'Email verified. Store created successfully',
    data: { user: result.user, store: result.store },
  });
});

const checkDomain = asyncHandler(async (req, res) => {
  const result = await authService.checkDomainAvailability(
    req.body.domain || req.body.customDomain
  );
  return successResponse(res, {
    message: 'Domain is available',
    data: result,
  });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  return successResponse(res, {
    message: 'Logged in successfully',
    data: { user: result.user },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  const result = await authService.refresh(refreshToken);
  setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  return successResponse(res, {
    message: 'Token refreshed',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user?.id) {
    await authService.logout(req.user.id);
  }
  clearAuthCookies(res);
  return successResponse(res, {
    message: 'Logged out successfully',
    data: null,
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return successResponse(res, {
    message: 'Profile fetched',
    data: { user },
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateMe(req.user.id, req.body);
  return successResponse(res, {
    message: 'Profile updated',
    data: { user },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  return successResponse(res, {
    message: result.message,
    data: null,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword({
    token: req.params.token,
    password: req.body.password,
  });
  clearAuthCookies(res);
  return successResponse(res, {
    message: result.message,
    data: null,
  });
});

module.exports = {
  register,
  registerStart,
  registerResendOtp,
  registerVerify,
  checkDomain,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
};
