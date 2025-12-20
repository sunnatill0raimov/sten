import mongoose from 'mongoose';
import crypto from 'crypto';

// Error codes and their corresponding HTTP status codes
const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: { status: 400, message: 'Invalid input data' },
  INVALID_ID: { status: 400, message: 'Invalid ID format' },
  MISSING_REQUIRED_FIELD: { status: 400, message: 'Required field is missing' },
  INVALID_INPUT_FORMAT: { status: 400, message: 'Invalid input format' },
  
  // Authentication errors (401)
  AUTH_REQUIRED: { status: 401, message: 'Authentication required' },
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid credentials' },
  TOKEN_EXPIRED: { status: 401, message: 'Authentication token has expired' },
  TOKEN_INVALID: { status: 401, message: 'Invalid authentication token' },
  
  // Authorization errors (403)
  PERMISSION_DENIED: { status: 403, message: 'Insufficient permissions' },
  ACCOUNT_LOCKED: { status: 403, message: 'Account is locked' },
  ACCESS_DENIED: { status: 403, message: 'Access denied' },
  
  // Not found errors (404)
  RESOURCE_NOT_FOUND: { status: 404, message: 'Resource not found' },
  USER_NOT_FOUND: { status: 404, message: 'User not found' },
  STEN_NOT_FOUND: { status: 404, message: 'STEN not found' },
  
  // Conflict errors (409)
  DUPLICATE_RESOURCE: { status: 409, message: 'Resource already exists' },
  DUPLICATE_EMAIL: { status: 409, message: 'Email already registered' },
  DUPLICATE_USERNAME: { status: 409, message: 'Username already taken' },
  
  // Rate limiting errors (429)
  RATE_LIMIT_EXCEEDED: { status: 429, message: 'Rate limit exceeded' },
  CREATE_STEN_RATE_LIMIT_EXCEEDED: { status: 429, message: 'Too many STENs created, please try again later' },
  SOLVE_STEN_RATE_LIMIT_EXCEEDED: { status: 429, message: 'Too many solve attempts, please try again later' },
  AUTH_RATE_LIMIT_EXCEEDED: { status: 429, message: 'Too many authentication attempts, please try again later' },
  
  // Client errors (422)
  UNPROCESSABLE_ENTITY: { status: 422, message: 'Request cannot be processed' },
  STEN_EXPIRED: { status: 422, message: 'STEN has expired' },
  STEN_SOLVED: { status: 422, message: 'STEN has already been solved' },
  MAX_WINNERS_REACHED: { status: 422, message: 'Maximum winners reached' },
  INVALID_PASSWORD: { status: 422, message: 'Invalid password' },
  WEAK_PASSWORD: { status: 422, message: 'Password is too weak' },
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR: { status: 500, message: 'Internal server error' },
  DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
  ENCRYPTION_ERROR: { status: 500, message: 'Encryption/decryption failed' },
  EMAIL_SEND_FAILED: { status: 500, message: 'Failed to send email' },
  
  // Service unavailable (503)
  SERVICE_UNAVAILABLE: { status: 503, message: 'Service temporarily unavailable' },
  MAINTENANCE_MODE: { status: 503, message: 'System under maintenance' }
};

// Custom error class
class AppError extends Error {
  constructor(message, code, statusCode, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    // Generate error ID for tracking
    this.errorId = crypto.randomBytes(8).toString('hex');
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Create error from code
const createError = (code, customMessage = null, details = null) => {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const message = customMessage || errorInfo.message;
  return new AppError(message, code, errorInfo.status, details);
};

// Mongoose validation error handler
const handleMongooseValidationError = (err) => {
  const errors = Object.values(err.errors).map(e => ({
    field: e.path,
    message: e.message,
    value: e.value
  }));
  
  return createError('VALIDATION_ERROR', 'Validation failed', errors);
};

// Mongoose duplicate key error handler
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyPattern)[0];
  const value = err.keyValue[field];
  
  if (field === 'email') {
    return createError('DUPLICATE_EMAIL');
  }
  if (field === 'username') {
    return createError('DUPLICATE_USERNAME');
  }
  
  return createError('DUPLICATE_RESOURCE', `${field} '${value}' already exists`);
};

// Mongoose cast error handler
const handleCastError = (err) => {
  if (err.path === '_id') {
    return createError('INVALID_ID', 'Invalid ID format');
  }
  
  return createError('INVALID_INPUT_FORMAT', `Invalid ${err.path}: ${err.value}`);
};

// JWT error handler
const handleJWTError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return createError('TOKEN_INVALID');
  }
  if (err.name === 'TokenExpiredError') {
    return createError('TOKEN_EXPIRED');
  }
  return createError('INTERNAL_SERVER_ERROR');
};

// Development vs production error response
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    error: err.name,
    message: err.message,
    code: err.code,
    errorId: err.errorId,
    details: err.details,
    stack: err.stack,
    timestamp: err.timestamp
  });
};

const sendErrorProd = (err, res) => {
  // Only send operational errors to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      errorId: err.errorId,
      details: err.details,
      timestamp: err.timestamp
    });
  } else {
    // Programming or unknown errors: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
      errorId: err.errorId,
      timestamp: new Date().toISOString()
    });
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${error.statusCode} - ${error.message}`, {
    errorId: error.errorId || crypto.randomBytes(8).toString('hex'),
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: error.stack
  });

  // Handle specific error types
  if (err.name === 'ValidationError' && err.errors) {
    error = handleMongooseValidationError(err);
  } else if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  } else if (err.name === 'CastError') {
    error = handleCastError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'AppError') {
    // Already an AppError, use as-is
    error = err;
  } else {
    // Unknown error
    error = createError('INTERNAL_SERVER_ERROR', err.message);
  }

  // Send error response based on environment
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = createError('RESOURCE_NOT_FOUND', `Route ${req.originalUrl} not found`);
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error helper
const createValidationError = (field, message, value) => {
  return {
    field,
    message,
    value
  };
};

// Bulk validation error helper
const createBulkValidationError = (errors) => {
  return createError('VALIDATION_ERROR', 'Multiple validation errors occurred', errors);
};

// Success response helper
const createSuccessResponse = (data, message = 'Success', metadata = {}) => {
  return {
    success: true,
    message,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };
};

// Paginated response helper
const createPaginatedResponse = (data, pagination, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
};

// Error response helper (for manual responses)
const createErrorResponse = (code, customMessage = null, details = null) => {
  const errorInfo = ERROR_CODES[code] || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const message = customMessage || errorInfo.message;
  
  return {
    success: false,
    error: code,
    message,
    details,
    timestamp: new Date().toISOString()
  };
};

// Health check response helper
const createHealthResponse = (status, checks = {}) => {
  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
};

export {
  AppError,
  createError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createValidationError,
  createBulkValidationError,
  createSuccessResponse,
  createPaginatedResponse,
  createErrorResponse,
  createHealthResponse,
  ERROR_CODES
};

export default errorHandler;
