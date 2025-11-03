const logger = require('../utils/logger');

/**
 * Error types
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Async error handler wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path,
  });
}

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  // Log error
  if (err.statusCode >= 500) {
    logger.error('Server error:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      userId: req.userId,
    });
  } else {
    logger.warn('Client error:', {
      error: err.message,
      url: req.url,
      method: req.method,
      userId: req.userId,
    });
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Build error response
  const errorResponse = {
    error: err.name || 'Error',
    message: err.message || 'Something went wrong',
  };

  // Add details if available
  if (err.details) {
    errorResponse.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

/**
 * Validation error formatter for express-validator
 */
function formatValidationErrors(errors) {
  return errors.array().map((error) => ({
    field: error.param,
    message: error.msg,
    value: error.value,
  }));
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
  formatValidationErrors,
};
