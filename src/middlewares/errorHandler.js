const AppError = require('../utils/AppError');

const notFound = (req, _res, next) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404));
};

const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors;

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    message = `Duplicate value for: ${fields.join(', ') || 'unique field'}`;
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors || undefined,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
