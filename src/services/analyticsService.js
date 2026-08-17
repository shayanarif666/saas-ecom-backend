const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const StoreCustomer = require('../models/StoreCustomer');
const Category = require('../models/Category');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const getAnalytics = async (storeId, { days = 30 } = {}) => {
  const storeObjectId = toObjectId(storeId);
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - days);
  periodStart.setHours(0, 0, 0, 0);

  const prevStart = new Date(periodStart);
  prevStart.setDate(prevStart.getDate() - days);

  const paidFilter = {
    storeId: storeObjectId,
    paymentStatus: { $in: ['paid'] },
    orderStatus: { $ne: 'cancelled' },
  };

  const [
    revenueAgg,
    prevRevenueAgg,
    ordersCount,
    prevOrdersCount,
    customersCount,
    productsCount,
    lowStockCount,
    revenueByDay,
    topCustomers,
    latestOrders,
    salesByCategory,
    billingBreakdown,
  ] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          ...paidFilter,
          createdAt: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          ...paidFilter,
          createdAt: { $gte: prevStart, $lt: periodStart },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]),
    Order.countDocuments({
      storeId: storeObjectId,
      createdAt: { $gte: periodStart },
    }),
    Order.countDocuments({
      storeId: storeObjectId,
      createdAt: { $gte: prevStart, $lt: periodStart },
    }),
    StoreCustomer.countDocuments({ storeId: storeObjectId }),
    Product.countDocuments({ storeId: storeObjectId }),
    Product.countDocuments({
      storeId: storeObjectId,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    }),
    Order.aggregate([
      {
        $match: {
          ...paidFilter,
          createdAt: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: 1,
          orders: 1,
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          paymentStatus: 'paid',
          customerId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalSpent: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          name: '$customer.name',
          email: '$customer.email',
          phone: '$customer.phone',
          totalSpent: 1,
          orders: 1,
          lastOrderAt: 1,
        },
      },
    ]),
    Order.find({ storeId: storeObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customerId', 'name email')
      .select(
        'orderNumber orderStatus paymentStatus paymentMethod totalAmount createdAt shippingAddress.name'
      ),
    Order.aggregate([
      {
        $match: {
          ...paidFilter,
          createdAt: { $gte: periodStart },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$product.categoryId',
          revenue: { $sum: '$items.subtotal' },
          unitsSold: { $sum: '$items.quantity' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          categoryId: '$_id',
          categoryName: { $ifNull: ['$category.name', 'Uncategorized'] },
          revenue: 1,
          unitsSold: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([
      {
        $match: {
          storeId: storeObjectId,
          paymentStatus: { $in: ['paid', 'refunded'] },
          createdAt: { $gte: periodStart },
        },
      },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
            },
          },
          refunded: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'refunded'] },
                { $ifNull: ['$refund.amount', '$totalAmount'] },
                0,
              ],
            },
          },
          orders: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          paymentMethod: '$_id',
          revenue: 1,
          refunded: 1,
          orders: 1,
        },
      },
    ]),
  ]);

  const revenue = revenueAgg[0]?.revenue || 0;
  const prevRevenue = prevRevenueAgg[0]?.revenue || 0;
  const revenueChangePercent =
    prevRevenue === 0
      ? revenue > 0
        ? 100
        : 0
      : Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1));

  const ordersChangePercent =
    prevOrdersCount === 0
      ? ordersCount > 0
        ? 100
        : 0
      : Number(
          (((ordersCount - prevOrdersCount) / prevOrdersCount) * 100).toFixed(1)
        );

  // Ensure category collection is registered for lookups when empty
  void Category;

  return {
    kpis: {
      revenue,
      revenueChangePercent,
      // Dashboard aliases
      revenueChangePct: revenueChangePercent,
      orders: ordersCount,
      ordersChangePercent,
      ordersChangePct: ordersChangePercent,
      customers: customersCount,
      products: productsCount,
      lowStock: lowStockCount,
    },
    revenueByDay,
    topCustomers: topCustomers.map((c) => ({
      ...c,
      userId: c.customerId,
      totalOrders: c.orders,
    })),
    latestOrders,
    salesByCategory: salesByCategory.map((row) => ({
      ...row,
      name: row.categoryName,
    })),
    billingBreakdown: billingBreakdown.map((row) => ({
      ...row,
      _id: row.paymentMethod,
    })),
    period: { days, from: periodStart, to: now },
  };
};

module.exports = { getAnalytics };
