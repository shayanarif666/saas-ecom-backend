/**
 * In-place mongo sanitize for Express 5 (never assign req.query = ...).
 * Strips keys that start with `$` or contain `.` from objects recursively.
 */
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      value[i] = sanitizeValue(value[i]);
    }
    return value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
      continue;
    }
    value[key] = sanitizeValue(value[key]);
  }
  return value;
};

const sanitizeRequest = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeValue(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeValue(req.params);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeValue(req.query);
  }
  next();
};

module.exports = sanitizeRequest;
