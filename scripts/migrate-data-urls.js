/**
 * One-time migration: replace Mongo data:image/*;base64,... fields with /uploads file URLs.
 * Run: node scripts/migrate-data-urls.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config/env');
const Store = require('../src/models/Store');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const {
  isDataUrl,
  persistDataUrlIfNeeded,
  ensureUploadsDir,
} = require('../src/utils/localUploads');

const migrateUrl = (value, hint) => {
  if (!isDataUrl(value)) return { value, changed: false };
  return { value: persistDataUrlIfNeeded(value, hint), changed: true };
};

const migrateStore = async (store) => {
  let changed = false;
  const logo = migrateUrl(store.logoUrl, `store-${store._id}-logo`);
  if (logo.changed) {
    store.logoUrl = logo.value;
    changed = true;
  }
  const fav = migrateUrl(store.faviconUrl, `store-${store._id}-favicon`);
  if (fav.changed) {
    store.faviconUrl = fav.value;
    changed = true;
  }

  if (Array.isArray(store.bannerUrls) && store.bannerUrls.length) {
    store.bannerUrls = store.bannerUrls.map((url, i) => {
      const r = migrateUrl(url, `store-${store._id}-banner-${i}`);
      if (r.changed) changed = true;
      return r.value;
    });
  }

  if (Array.isArray(store.banners) && store.banners.length) {
    store.banners = store.banners.map((b, i) => {
      const r = migrateUrl(b.imageUrl, `store-${store._id}-banners-${i}`);
      if (r.changed) {
        changed = true;
        b.imageUrl = r.value;
      }
      return b;
    });
  }

  // Keep bannerUrls in sync with banners when banners exist
  if (Array.isArray(store.banners) && store.banners.length) {
    store.bannerUrls = store.banners.map((b) => b.imageUrl);
  }

  if (changed) await store.save();
  return changed;
};

const migrateProduct = async (product) => {
  if (!Array.isArray(product.images) || !product.images.length) return false;
  let changed = false;
  product.images = product.images.map((url, i) => {
    const r = migrateUrl(url, `product-${product._id}-${i}`);
    if (r.changed) changed = true;
    return r.value;
  });
  if (changed) await product.save();
  return changed;
};

const migrateCategory = async (category) => {
  const r = migrateUrl(category.imageUrl, `category-${category._id}`);
  if (!r.changed) return false;
  category.imageUrl = r.value;
  await category.save();
  return true;
};

const main = async () => {
  ensureUploadsDir();
  await mongoose.connect(mongoUri);
  console.log('Connected. Migrating data URLs → /uploads ...');

  let storesChanged = 0;
  const stores = await Store.find({});
  for (const store of stores) {
    // eslint-disable-next-line no-await-in-loop
    if (await migrateStore(store)) {
      storesChanged += 1;
      console.log(`Store updated: ${store.customDomain || store.slug}`);
    }
  }

  let productsChanged = 0;
  const products = await Product.find({});
  for (const product of products) {
    // eslint-disable-next-line no-await-in-loop
    if (await migrateProduct(product)) {
      productsChanged += 1;
      console.log(`Product updated: ${product.title}`);
    }
  }

  let categoriesChanged = 0;
  const categories = await Category.find({});
  for (const category of categories) {
    // eslint-disable-next-line no-await-in-loop
    if (await migrateCategory(category)) {
      categoriesChanged += 1;
      console.log(`Category updated: ${category.name}`);
    }
  }

  console.log(
    JSON.stringify({
      storesChanged,
      productsChanged,
      categoriesChanged,
      done: true,
    })
  );
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
