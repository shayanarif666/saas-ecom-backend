const express = require('express');
const storeController = require('../controllers/storeController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const validate = require('../middlewares/validate');
const storeValidation = require('../validations/storeValidation');

const router = express.Router();

router.use(verifyJWT, authorizeRoles('administrator', 'superadmin'), scopeToStore, requireStoreId);

router.get('/me', storeController.getMyStore);
router.patch('/me', validate(storeValidation.updateStore), storeController.updateMyStore);

module.exports = router;
