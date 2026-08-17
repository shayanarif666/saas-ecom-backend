const express = require('express');
const billingController = require('../controllers/billingController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const billingValidation = require('../validations/billingValidation');

const router = express.Router();

router.use(
  verifyJWT,
  authorizeRoles('administrator', 'superadmin'),
  scopeToStore,
  requireStoreId
);

router.get(
  '/summary',
  validate(billingValidation.summary),
  billingController.getSummary
);
router.get(
  '/refunds',
  validate(billingValidation.refunds),
  billingController.listRefunds
);
router.get(
  '/transactions',
  validate(billingValidation.transactions),
  billingController.listTransactions
);
router.get(
  '/transactions/:id',
  validate(billingValidation.getTransaction),
  billingController.getTransaction
);

module.exports = router;
