const express = require('express');

const authRoutes = require('./authRoutes');
const storeRoutes = require('./storeRoutes');
const productRoutes = require('./productRoutes');
const categoryRoutes = require('./categoryRoutes');
const orderRoutes = require('./orderRoutes');
const discountRoutes = require('./discountRoutes');
const receiptRoutes = require('./receiptRoutes');
const reviewRoutes = require('./reviewRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const billingRoutes = require('./billingRoutes');
const uploadRoutes = require('./uploadRoutes');
const storefrontRoutes = require('./storefrontRoutes');

const router = express.Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'BookStore API v1',
    data: {
      endpoints: [
        '/auth',
        '/stores',
        '/products',
        '/categories',
        '/orders',
        '/discounts',
        '/receipts',
        '/reviews',
        '/dashboard',
        '/billing',
        '/upload',
        '/storefront',
      ],
    },
  });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/discounts', discountRoutes);
router.use('/receipts', receiptRoutes);
router.use('/reviews', reviewRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/billing', billingRoutes);
router.use('/upload', uploadRoutes);
router.use('/storefront', storefrontRoutes);

module.exports = router;
