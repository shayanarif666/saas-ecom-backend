const express = require('express');
const receiptController = require('../controllers/receiptController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const receiptValidation = require('../validations/receiptValidation');

const router = express.Router();

router.use(verifyJWT, authorizeRoles('administrator', 'superadmin'), scopeToStore, requireStoreId);

router.get(
  '/order/:orderId',
  validate(receiptValidation.getByOrder),
  receiptController.getByOrder
);

module.exports = router;
