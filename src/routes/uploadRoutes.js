const express = require('express');
const uploadController = require('../controllers/uploadController');
const verifyJWT = require('../middlewares/verifyJWT');
const authorizeRoles = require('../middlewares/authorizeRoles');
const scopeToStore = require('../middlewares/scopeToStore');
const { requireStoreId } = require('../middlewares/scopeToStore');
const upload = require('../middlewares/upload');

const router = express.Router();

router.use(verifyJWT, authorizeRoles('administrator', 'superadmin'), scopeToStore, requireStoreId);

router.post('/', upload.array('images', 10), uploadController.upload);

module.exports = router;
