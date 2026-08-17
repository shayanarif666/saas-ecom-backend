const AppError = require('../utils/AppError');

/**
 * Joi validation middleware.
 * For Express 5: replace validated query via Object.defineProperty (never req.query =).
 *
 * @param {object} schemas - { body?, query?, params? } Joi schemas
 */
const validate = (schemas = {}) => (req, _res, next) => {
  const errors = [];

  if (schemas.body) {
    const { error, value } = schemas.body.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      errors.push(
        ...error.details.map((d) => ({
          field: d.path.join('.') || 'body',
          message: d.message,
        }))
      );
    } else {
      req.body = value;
    }
  }

  if (schemas.params) {
    const { error, value } = schemas.params.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      errors.push(
        ...error.details.map((d) => ({
          field: d.path.join('.') || 'params',
          message: d.message,
        }))
      );
    } else {
      Object.assign(req.params, value);
      for (const key of Object.keys(req.params)) {
        if (!(key in value)) delete req.params[key];
      }
    }
  }

  if (schemas.query) {
    const { error, value } = schemas.query.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      errors.push(
        ...error.details.map((d) => ({
          field: d.path.join('.') || 'query',
          message: d.message,
        }))
      );
    } else {
      Object.defineProperty(req, 'query', {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  }

  if (errors.length) {
    return next(new AppError('Validation failed', 422, errors));
  }

  return next();
};

module.exports = validate;
