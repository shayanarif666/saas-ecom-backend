const express = require('express');
const reviewController = require('../controllers/reviewController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const reviewValidation = require('../validations/reviewValidation');

const router = express.Router();

router.use(
  verifyJWT,
  authorizeRoles('administrator', 'superadmin'),
  scopeToStore,
  requireStoreId
);

router.get('/', validate(reviewValidation.list), reviewController.list);
router.get('/:id', validate(reviewValidation.getById), reviewController.getById);
router.patch(
  '/:id/status',
  validate(reviewValidation.updateStatus),
  reviewController.updateStatus
);
router.delete('/:id', validate(reviewValidation.remove), reviewController.remove);

module.exports = router;
