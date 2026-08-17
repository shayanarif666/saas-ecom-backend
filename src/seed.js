/**
 * Seed demo data for local development.
 * Usage: npm run seed
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { hashPassword } = require('./utils/password');
const {
  User,
  Store,
  Category,
  Product,
  Discount,
  SubscriptionPlan,
  Order,
  Receipt,
  Payment,
  StoreCustomer,
} = require('./models');

const SUPERADMIN = {
  name: 'Platform Superadmin',
  email: 'superadmin@bookstore.local',
  password: 'SuperAdmin@123',
};

const ADMIN = {
  name: 'Acadex Store Admin',
  email: 'admin@acadex.com',
  password: 'Admin@12345',
  storeName: 'Acadex',
  storeSlug: 'acadex',
};

const CUSTOMER = {
  name: 'Ayesha Khan',
  email: 'customer@demo.local',
  password: 'Customer@123',
};

const clearCollections = async () => {
  await Promise.all([
    User.deleteMany({}),
    Store.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Discount.deleteMany({}),
    Order.deleteMany({}),
    Receipt.deleteMany({}),
    Payment.deleteMany({}),
    StoreCustomer.deleteMany({}),
    SubscriptionPlan.deleteMany({}),
  ]);
};

// Ensure Address model is cleared when present
try {
  const Address = require('./models/Address');
  clearCollections._address = Address;
} catch {
  /* optional */
}

const clearAll = async () => {
  await clearCollections();
  try {
    const Address = require('./models/Address');
    await Address.deleteMany({});
  } catch {
    /* ignore */
  }
};

const seed = async () => {
  await connectDB();
  console.log('Seeding database...');

  await clearAll();

  const plan = await SubscriptionPlan.create({
    name: 'Starter',
    price: 2999,
    billingCycle: 'monthly',
    maxProducts: 200,
    features: ['products', 'orders', 'discounts', 'analytics'],
    isActive: true,
  });

  const superadmin = await User.create({
    name: SUPERADMIN.name,
    email: SUPERADMIN.email,
    passwordHash: await hashPassword(SUPERADMIN.password),
    role: 'superadmin',
    isVerified: true,
  });

  const admin = await User.create({
    name: ADMIN.name,
    email: ADMIN.email,
    passwordHash: await hashPassword(ADMIN.password),
    role: 'administrator',
    phone: '+923001234567',
    isVerified: true,
  });

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const store = await Store.create({
    name: ADMIN.storeName,
    slug: ADMIN.storeSlug,
    customDomain: 'acadex.com',
    businessType: 'bookstore',
    ownerId: admin._id,
    contactEmail: ADMIN.email,
    contactPhone: '+923001234567',
    address: '12 Reader Lane, Gulberg III, Lahore',
    logoUrl: 'https://placehold.co/200x80/png?text=Acadex',
    bannerUrls: [
      'https://placehold.co/1200x400/1e1b4b/ffffff/png?text=Academic+Excellence',
      'https://placehold.co/1200x400/1e3a5f/ffffff/png?text=New+Arrivals',
    ],
    banners: [],
    themeColors: {
      primary: '#1e1b4b',
      secondary: '#f59e0b',
      accent: '#10b981',
    },
    websiteContent: {
      homepageHeadline: 'Academic excellence & success',
      homepageSubheadline: 'Books, bags, stationery, and school essentials',
      aboutTitle: 'About Acadex',
      aboutBody: 'Your trusted partner for academic books and school supplies.',
      contactTitle: 'Get in touch',
      contactBody: 'Email us at admin@acadex.com or call +92 300 1234567.',
      footerText: '© Acadex — powered by BookStore Platform',
      termsBody: 'Sample terms of service.',
      privacyBody: 'Sample privacy policy.',
      faqBody: 'Q: Do you ship nationwide?\nA: Yes.',
      features: require('./constants/homepageFeatures').DEFAULT_HOMEPAGE_FEATURES,
    },
    shipping: { flatFee: 200, freeOverAmount: 3000 },
    subscriptionPlanId: plan._id,
    subscriptionStatus: 'trial',
    subscriptionExpiresAt: trialEnds,
    onboardingCompleted: true,
    isLive: true,
  });

  admin.storeId = store._id;
  await admin.save();

  const customer = await User.create({
    name: CUSTOMER.name,
    email: CUSTOMER.email,
    passwordHash: await hashPassword(CUSTOMER.password),
    role: 'customer',
    phone: '+923119876543',
    isVerified: true,
  });

  const Address = require('./models/Address');
  await Address.create({
    storeId: store._id,
    userId: customer._id,
    label: 'Home',
    name: CUSTOMER.name,
    phone: '+923119876543',
    email: CUSTOMER.email,
    addressLine: '45 Gulberg III',
    city: 'Lahore',
    postalCode: '54000',
    isDefault: true,
  });

  const fiction = await Category.create({
    storeId: store._id,
    name: 'Fiction',
    slug: 'fiction',
    sortOrder: 1,
    isActive: true,
  });

  const nonFiction = await Category.create({
    storeId: store._id,
    name: 'Non-Fiction',
    slug: 'non-fiction',
    sortOrder: 2,
    isActive: true,
  });

  const products = await Product.insertMany([
    {
      storeId: store._id,
      categoryId: fiction._id,
      title: 'The Silent Library',
      slug: 'the-silent-library',
      sku: 'BK-001',
      description: 'A gripping mystery set in a forgotten archive.',
      images: ['https://placehold.co/400x600/png?text=Silent+Library'],
      price: 1299,
      discountPrice: 999,
      stockQuantity: 42,
      lowStockThreshold: 5,
      isPublished: true,
      author: 'Sara Ahmed',
      publisher: 'Horizon Press',
      language: 'English',
      isbn: '9780000000001',
      soldCount: 18,
    },
    {
      storeId: store._id,
      categoryId: fiction._id,
      title: 'Karachi Nights',
      slug: 'karachi-nights',
      sku: 'BK-002',
      description: 'Stories from the city that never sleeps.',
      images: ['https://placehold.co/400x600/png?text=Karachi+Nights'],
      price: 899,
      stockQuantity: 3,
      lowStockThreshold: 5,
      isPublished: true,
      author: 'Bilal Raza',
      publisher: 'Indus House',
      language: 'English',
      isbn: '9780000000002',
      soldCount: 55,
    },
    {
      storeId: store._id,
      categoryId: nonFiction._id,
      title: 'Habits of Focus',
      slug: 'habits-of-focus',
      sku: 'BK-003',
      description: 'Practical systems for deep work.',
      images: ['https://placehold.co/400x600/png?text=Habits+of+Focus'],
      price: 1499,
      stockQuantity: 25,
      lowStockThreshold: 5,
      isPublished: true,
      author: 'Nadia Malik',
      publisher: 'Clarity Books',
      language: 'English',
      isbn: '9780000000003',
      soldCount: 30,
    },
  ]);

  await Discount.create({
    storeId: store._id,
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minOrderAmount: 500,
    startDate: new Date(Date.now() - 7 * 86_400_000),
    endDate: new Date(Date.now() + 60 * 86_400_000),
    usageLimit: 100,
    isActive: true,
  });

  const order = await Order.create({
    storeId: store._id,
    orderNumber: 'ORD-SEED-0001',
    customerId: customer._id,
    items: [
      {
        productId: products[0]._id,
        title: products[0].title,
        sku: products[0].sku,
        imageUrl: products[0].images[0],
        unitPrice: 999,
        quantity: 1,
        subtotal: 999,
      },
    ],
    shippingAddress: {
      name: CUSTOMER.name,
      phone: '+923119876543',
      email: CUSTOMER.email,
      addressLine: '45 Gulberg III',
      city: 'Lahore',
      postalCode: '54000',
    },
    subtotal: 999,
    discountAmount: 0,
    shippingFee: 200,
    taxAmount: 0,
    totalAmount: 1199,
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    orderStatus: 'processing',
  });

  await Receipt.create({
    storeId: store._id,
    orderId: order._id,
    receiptNumber: 'RCPT-SEED-0001',
    customerId: customer._id,
    items: [
      {
        title: products[0].title,
        quantity: 1,
        unitPrice: 999,
        subtotal: 999,
      },
    ],
    subtotal: 999,
    discountAmount: 0,
    taxAmount: 0,
    shippingFee: 200,
    totalAmount: 1199,
    paymentMethod: 'cod',
    storeSnapshot: {
      name: store.name,
      address: store.address,
      contactPhone: store.contactPhone,
      logoUrl: store.logoUrl,
    },
  });

  await Payment.create({
    storeId: store._id,
    orderId: order._id,
    gateway: 'cod',
    amount: 1199,
    status: 'success',
  });

  await StoreCustomer.create({
    storeId: store._id,
    userId: customer._id,
    totalOrders: 1,
    totalSpent: 1199,
    lastOrderAt: order.createdAt,
    firstOrderAt: order.createdAt,
  });

  console.log('\n========== SEED COMPLETE ==========\n');
  console.log(`STORE_ID=${store._id.toString()}`);
  console.log(`STORE_SLUG=${store.slug}`);
  console.log(`STORE_DOMAIN=${store.customDomain}`);
  console.log('(Localhost storefront resolves to this domain via DEFAULT_STORE_DOMAIN)');
  console.log('\nSuperadmin:');
  console.log(`  email:    ${SUPERADMIN.email}`);
  console.log(`  password: ${SUPERADMIN.password}`);
  console.log('\nAdministrator (store owner):');
  console.log(`  email:    ${ADMIN.email}`);
  console.log(`  password: ${ADMIN.password}`);
  console.log('\nCustomer:');
  console.log(`  email:    ${CUSTOMER.email}`);
  console.log(`  password: ${CUSTOMER.password}`);
  console.log('\n===================================\n');
};

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
