require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('../src/models/Store');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const r = await Store.updateMany(
    { customDomain: 'acadex.com' },
    { $set: { isLive: true, isActive: true } }
  );
  console.log('updated', r.modifiedCount, 'store(s)');
  const s = await Store.findOne({ customDomain: 'acadex.com' }).select(
    'name customDomain isLive isActive'
  );
  console.log(s);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
