const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const dashboardValidation = require('../validations/dashboardValidation');

const router = express.Router();

router.use(verifyJWT, authorizeRoles('administrator', 'superadmin'), scopeToStore, requireStoreId);

router.get(
  '/analytics',
  validate(dashboardValidation.analytics),
  dashboardController.getAnalytics
);

module.exports = router;
