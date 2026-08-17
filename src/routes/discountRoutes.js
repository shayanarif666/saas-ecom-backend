const express = require('express');
const discountController = require('../controllers/discountController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const discountValidation = require('../validations/discountValidation');

const router = express.Router();

router.use(
  verifyJWT,
  authorizeRoles('administrator', 'superadmin'),
  scopeToStore,
  requireStoreId
);

router.get('/', validate(discountValidation.list), discountController.list);
router.post('/', validate(discountValidation.create), discountController.create);
router.post(
  '/validate',
  validate(discountValidation.validateCode),
  discountController.validateCode
);
router.get('/:id', validate(discountValidation.getById), discountController.getById);
router.patch('/:id', validate(discountValidation.update), discountController.update);
router.delete('/:id', validate(discountValidation.remove), discountController.remove);

module.exports = router;
