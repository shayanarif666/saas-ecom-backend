const express = require('express');
const categoryController = require('../controllers/categoryController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const categoryValidation = require('../validations/categoryValidation');

const router = express.Router();

router.use(verifyJWT, authorizeRoles('administrator', 'superadmin'), scopeToStore, requireStoreId);

router.get('/', validate(categoryValidation.list), categoryController.list);
router.get('/:id', validate(categoryValidation.getById), categoryController.getById);
router.post('/', validate(categoryValidation.create), categoryController.create);
router.patch('/:id', validate(categoryValidation.update), categoryController.update);
router.delete('/:id', validate(categoryValidation.remove), categoryController.remove);

module.exports = router;
