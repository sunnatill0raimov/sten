import Joi from 'joi';

// Common validation patterns
const patterns = {
  stenId: /^[a-f\d]{24}$/i, // MongoDB ObjectId pattern
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  securePassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// Sten validation schemas
const stenSchemas = {
  createSten: Joi.object({
    message: Joi.string()
      .min(1)
      .max(10000)
      .required()
      .custom((value, helpers) => {
        // XSS prevention
        if (/<script|javascript:|on\w+=/i.test(value)) {
          return helpers.error('message.xss');
        }
        return value;
      })
      .messages({
        'string.empty': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 10,000 characters',
        'message.xss': 'Message contains potentially dangerous content'
      }),
    
    isPasswordProtected: Joi.boolean()
      .required(),
    
    password: Joi.when('isPasswordProtected', {
      is: true,
      then: Joi.string()
        .min(8)
        .max(128)
        .pattern(patterns.securePassword)
        .required()
        .messages({
          'string.empty': 'Password is required when protection is enabled',
          'string.min': 'Password must be at least 8 characters long',
          'string.max': 'Password cannot exceed 128 characters',
          'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }),
      otherwise: Joi.string().allow('', null)
    }),
    
    expiresAt: Joi.string()
      .isoDate()
      .required()
      .custom((value, helpers) => {
        const now = new Date();
        const expiresAt = new Date(value);
        const minDuration = 5 * 60 * 1000; // 5 minutes
        const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year
        
        if (expiresAt <= now) {
          return helpers.error('expiresAt.past');
        }
        
        const duration = expiresAt - now;
        if (duration < minDuration) {
          return helpers.error('expiresAt.tooSoon');
        }
        
        if (duration > maxDuration) {
          return helpers.error('expiresAt.tooFar');
        }
        
        return value;
      })
      .messages({
        'string.isoDate': 'Invalid date format',
        'expiresAt.past': 'Expiration date must be in the future',
        'expiresAt.tooSoon': 'STEN must expire at least 5 minutes from now',
        'expiresAt.tooFar': 'STEN cannot expire more than 1 year from now'
      }),
    
    maxWinners: Joi.number()
      .integer()
      .min(1)
      .max(999999)
      .required()
      .messages({
        'number.base': 'Max winners must be a number',
        'number.integer': 'Max winners must be an integer',
        'number.min': 'Max winners must be at least 1',
        'number.max': 'Max winners cannot exceed 999,999'
      }),
    
    oneTime: Joi.boolean()
      .required()
  }),

  solveSten: Joi.object({
    password: Joi.string()
      .allow('', null)
      .messages({
        'string.base': 'Password must be a string'
      }),
    
    userId: Joi.string()
      .required()
      .pattern(patterns.stenId)
      .messages({
        'string.empty': 'User ID is required',
        'string.pattern.base': 'Invalid user ID format'
      })
  }),

  viewSten: Joi.object({
    password: Joi.string()
      .allow('', null)
      .messages({
        'string.base': 'Password must be a string'
      })
  })
};

// Auth validation schemas
const authSchemas = {
  register: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(patterns.username)
      .required()
      .messages({
        'string.empty': 'Username is required',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username cannot exceed 30 characters',
        'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
      }),
    
    email: Joi.string()
      .email()
      .pattern(patterns.email)
      .required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Invalid email format'
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(patterns.securePassword)
      .required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      })
  }),

  login: Joi.object({
    username: Joi.string()
      .required()
      .messages({
        'string.empty': 'Username or email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Password is required'
      })
  }),

  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'string.empty': 'Reset token is required'
      }),
    
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(patterns.securePassword)
      .required()
      .messages({
        'string.empty': 'New password is required',
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      })
  })
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details,
        code: 'VALIDATION_ERROR'
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Specific validation middleware instances
const validateCreateSten = validate(stenSchemas.createSten);
const validateSolveSten = validate(stenSchemas.solveSten);
const validateViewSten = validate(stenSchemas.viewSten);
const validateRegister = validate(authSchemas.register);
const validateLogin = validate(authSchemas.login);
const validateResetPassword = validate(authSchemas.resetPassword);

// ID parameter validation
const validateStenId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || !patterns.stenId.test(id)) {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'Invalid STEN ID format',
      code: 'INVALID_ID'
    });
  }
  
  next();
};

const validateUserId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id || !patterns.stenId.test(id)) {
    return res.status(400).json({
      error: 'Invalid ID',
      message: 'Invalid user ID format',
      code: 'INVALID_ID'
    });
  }
  
  next();
};

export {
  validate,
  validateCreateSten,
  validateSolveSten,
  validateViewSten,
  validateRegister,
  validateLogin,
  validateResetPassword,
  validateStenId,
  validateUserId,
  patterns,
  stenSchemas,
  authSchemas
};
