const slugify = require('slugify');

const toSlug = (value, { fallback = 'item' } = {}) => {
  const slug = slugify(String(value || ''), {
    lower: true,
    strict: true,
    trim: true,
  });
  return slug || fallback;
};

/**
 * Ensure a unique slug within a store-scoped collection.
 * Model must have a unique index on { storeId, slug }.
 */
const ensureUniqueSlug = async (Model, { storeId, baseSlug, excludeId = null }) => {
  let candidate = baseSlug;
  let suffix = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { storeId, slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.exists(query);
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
};

/**
 * Ensure a globally unique store slug.
 */
const ensureUniqueStoreSlug = async (Store, { baseSlug, excludeId = null }) => {
  let candidate = baseSlug;
  let suffix = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const exists = await Store.exists(query);
    if (!exists) return candidate;
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
};

module.exports = { toSlug, ensureUniqueSlug, ensureUniqueStoreSlug };
