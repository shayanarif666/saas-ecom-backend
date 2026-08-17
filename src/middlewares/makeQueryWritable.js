/**
 * Express 5 makes req.query a getter-only object. Snapshot it onto a writable
 * plain object early so validation / sanitize can mutate or replace keys safely.
 */
const makeQueryWritable = (req, _res, next) => {
  const snapshot = { ...(req.query || {}) };
  Object.defineProperty(req, 'query', {
    value: snapshot,
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
};

module.exports = makeQueryWritable;
