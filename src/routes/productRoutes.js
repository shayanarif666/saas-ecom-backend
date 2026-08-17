const express = require('express');
const productController = require('../controllers/productController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const productValidation = require('../validations/productValidation');

const router = express.Router();

router.use(verifyJWT, authorizeRoles('administrator', 'superadmin'), scopeToStore, requireStoreId);

router.get('/', validate(productValidation.list), productController.list);
router.get('/slug/:slug', validate(productValidation.getBySlug), productController.getBySlug);
router.get('/:id', validate(productValidation.getById), productController.getById);
router.post('/', validate(productValidation.create), productController.create);
router.patch('/:id', validate(productValidation.update), productController.update);
router.delete('/:id', validate(productValidation.remove), productController.remove);

module.exports = router;
