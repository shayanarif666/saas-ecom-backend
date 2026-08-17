/**
 * Fill empty homepage features on existing stores.
 * Usage: node src/scripts/set-homepage-features.js
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Store = require('../models/Store');
const { DEFAULT_HOMEPAGE_FEATURES } = require('../constants/homepageFeatures');

(async () => {
  await connectDB();
  const result = await Store.updateMany(
    {
      $or: [
        { 'websiteContent.features': { $exists: false } },
        { 'websiteContent.features': { $size: 0 } },
      ],
    },
    { $set: { 'websiteContent.features': DEFAULT_HOMEPAGE_FEATURES } }
  );
  console.log(
    `Updated ${result.modifiedCount} store(s). Matched ${result.matchedCount}.`
  );
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
