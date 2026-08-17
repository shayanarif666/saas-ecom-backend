const express = require('express');
const orderController = require('../controllers/orderController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const orderValidation = require('../validations/orderValidation');

const router = express.Router();

router.use(verifyJWT, authorizeRoles('administrator', 'superadmin'), scopeToStore, requireStoreId);

router.get('/', validate(orderValidation.list), orderController.list);
router.get('/:id', validate(orderValidation.getById), orderController.getById);
router.patch(
  '/:id/status',
  validate(orderValidation.updateStatus),
  orderController.updateStatus
);
router.patch(
  '/:id/payment-status',
  validate(orderValidation.updatePaymentStatus),
  orderController.updatePaymentStatus
);
router.post(
  '/:id/refund',
  validate(orderValidation.refund),
  orderController.refund
);

module.exports = router;
