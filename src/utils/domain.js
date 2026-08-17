/**
 * Normalize a custom domain for multi-tenant storefront routing.
 * Accepts: acadex.pk | www.acadex.pk | https://www.acadex.pk/
 * Stores: acadex.pk (no protocol, no www, no path)
 */
const normalizeDomain = (input) => {
  let value = String(input || '')
    .trim()
    .toLowerCase();

  value = value.replace(/^https?:\/\//, '');
  value = value.split('/')[0];
  value = value.split('?')[0];
  value = value.replace(/:\d+$/, '');
  value = value.replace(/^www\./, '');

  if (!value) {
    const err = new Error('Domain is required');
    err.statusCode = 400;
    throw err;
  }

  const ok =
    value === 'localhost' ||
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
      value
    );

  if (!ok) {
    const err = new Error(
      'Enter a valid domain (e.g. acadex.pk or www.acadex.pk)'
    );
    err.statusCode = 400;
    throw err;
  }

  return value;
};

module.exports = { normalizeDomain };
