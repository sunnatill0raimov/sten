import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from './error.middleware.js';

// JWT authentication middleware
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.get('Authorization');
    
    if (!authHeader) {
      return next(createError('AUTH_REQUIRED'));
    }

    // Check token format
    if (!authHeader.startsWith('Bearer ')) {
      return next(createError('TOKEN_INVALID', 'Invalid token format'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'sten-api',
      audience: 'sten-users'
    });

    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(createError('USER_NOT_FOUND'));
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(createError('ACCOUNT_LOCKED', 'Account is not active'));
    }

    // Check if user is locked
    if (user.isLocked) {
      return next(createError('ACCOUNT_LOCKED'));
    }

    // Attach user to request object
    req.user = user;
    
    // Update last activity
    user.updateStats('last_activity');
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError('TOKEN_INVALID'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError('TOKEN_EXPIRED'));
    }
    return next(createError('INTERNAL_SERVER_ERROR', error.message));
  }
};

// Optional authentication (doesn't throw error if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'sten-api',
      audience: 'sten-users'
    });

    const user = await User.findById(decoded.id);
    
    if (user && user.status === 'active' && !user.isLocked) {
      req.user = user;
      user.updateStats('last_activity');
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('AUTH_REQUIRED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('PERMISSION_DENIED'));
    }

    next();
  };
};

// Check if user owns the resource
const checkOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('AUTH_REQUIRED'));
    }

    const resourceId = req.params.id || req.params.userId || req.body[resourceField];
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    if (req.user._id.toString() !== resourceId) {
      return next(createError('PERMISSION_DENIED', 'You can only access your own resources'));
    }

    next();
  };
};

// API key authentication middleware
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.get('X-API-Key');
    
    if (!apiKey) {
      return next(createError('AUTH_REQUIRED', 'API key is required'));
    }

    // Find user by API key
    const user = await User.findByApiKey(apiKey);
    
    if (!user) {
      return next(createError('INVALID_CREDENTIALS', 'Invalid API key'));
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(createError('ACCOUNT_LOCKED'));
    }

    // Update API key usage
    const apiKeyObj = user.apiKeys.find(key => key.key === apiKey);
    if (apiKeyObj) {
      apiKeyObj.lastUsed = new Date();
      await user.save();
    }

    // Attach user and API key info to request
    req.user = user;
    req.apiKey = apiKeyObj;
    
    // Update last activity
    user.updateStats('last_activity');
    
    next();
  } catch (error) {
    return next(createError('INTERNAL_SERVER_ERROR', error.message));
  }
};

// Check API key permissions
const checkApiKeyPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return next(createError('AUTH_REQUIRED', 'API key authentication required'));
    }

    const apiKeyPermissions = req.apiKey.permissions || [];
    const hasAllPermissions = permissions.every(permission => 
      apiKeyPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return next(createError('PERMISSION_DENIED', 'API key lacks required permissions'));
    }

    next();
  };
};

// Email verification check
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return next(createError('AUTH_REQUIRED'));
  }

  if (!req.user.emailVerified) {
    return next(createError('PERMISSION_DENIED', 'Email verification required'));
  }

  next();
};

// Two-factor authentication check
const requireTwoFactor = (req, res, next) => {
  if (!req.user) {
    return next(createError('AUTH_REQUIRED'));
  }

  if (req.user.twoFactorEnabled) {
    const twoFactorCode = req.get('X-2FA-Code');
    
    if (!twoFactorCode) {
      return next(createError('AUTH_REQUIRED', 'Two-factor authentication code required'));
    }

    // Here you would verify the 2FA code
    // For now, we'll assume it's valid
    // In production, implement TOTP verification
  }

  next();
};

// Subscription tier check
const requireSubscription = (...tiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('AUTH_REQUIRED'));
    }

    if (!tiers.includes(req.user.subscription.tier)) {
      return next(createError('PERMISSION_DENIED', `This feature requires ${tiers.join(' or ')} subscription`));
    }

    next();
  };
};

// Rate limit by user
const userRateLimit = (maxRequests, windowMs) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip for unauthenticated requests
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this user
    const userRequests = requests.get(userId) || [];
    
    // Filter out old requests
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return next(createError('RATE_LIMIT_EXCEEDED', `Too many requests. Maximum ${maxRequests} per ${windowMs/1000} seconds`));
    }

    // Add current request
    validRequests.push(now);
    requests.set(userId, validRequests);

    // Clean up old entries periodically
    setTimeout(() => {
      const currentRequests = requests.get(userId) || [];
      const filteredRequests = currentRequests.filter(timestamp => timestamp > windowStart);
      requests.set(userId, filteredRequests);
    }, windowMs);

    next();
  };
};

// Check if user has reached subscription limits
const checkSubscriptionLimits = (limitType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(); // Skip for unauthenticated requests
    }

    // Admins bypass limits
    if (req.user.role === 'admin') {
      return next();
    }

    const limitExceeded = req.user.checkSubscriptionLimit(limitType);
    
    if (limitExceeded) {
      return next(createError('PERMISSION_DENIED', 'Subscription limit exceeded'));
    }

    next();
  };
};

// Device fingerprinting middleware
const deviceFingerprint = (req, res, next) => {
  const fingerprint = {
    userAgent: req.get('User-Agent'),
    acceptLanguage: req.get('Accept-Language'),
    acceptEncoding: req.get('Accept-Encoding'),
    ip: req.ip,
    timestamp: Date.now()
  };

  // Store fingerprint in session or database for fraud detection
  req.deviceFingerprint = fingerprint;
  
  next();
};

// Suspicious activity detection
const detectSuspiciousActivity = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  const suspiciousIndicators = [];
  
  // Check for rapid location changes
  if (req.user.lastLoginIP && req.user.lastLoginIP !== req.ip) {
    suspiciousIndicators.push('IP address changed');
  }
  
  // Check for unusual user agent
  if (req.user.lastUserAgent && req.user.lastUserAgent !== req.get('User-Agent')) {
    suspiciousIndicators.push('User agent changed');
  }
  
  // Check for rapid requests
  const now = Date.now();
  if (req.user.lastActivity && (now - req.user.lastActivity.getTime()) < 1000) {
    suspiciousIndicators.push('Rapid requests detected');
  }

  // Log suspicious activity
  if (suspiciousIndicators.length > 0) {
    console.warn(`Suspicious activity detected for user ${req.user._id}: ${suspiciousIndicators.join(', ')}`);
    
    // Update user security flags
    req.user.security.suspiciousActivity = true;
    req.user.security.riskScore = Math.min(req.user.security.riskScore + 10, 100);
    req.user.security.lastSecurityCheck = new Date();
    
    // Lock account if risk score is too high
    if (req.user.security.riskScore >= 80) {
      req.user.status = 'locked';
      await req.user.save();
      return next(createError('ACCOUNT_LOCKED', 'Account locked due to suspicious activity'));
    }
  }

  // Update tracking info
  req.user.lastLoginIP = req.ip;
  req.user.lastUserAgent = req.get('User-Agent');
  
  next();
};

// Refresh token middleware
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return next(createError('AUTH_REQUIRED', 'Refresh token is required'));
    }

    // Verify refresh token (this would be stored in a separate collection)
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'sten-api',
      audience: 'sten-refresh'
    });

    const user = await User.findById(decoded.id);
    
    if (!user || user.status !== 'active') {
      return next(createError('TOKEN_INVALID'));
    }

    // Generate new tokens
    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = jwt.sign(
      { id: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d', issuer: 'sten-api', audience: 'sten-refresh' }
    );

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError('TOKEN_INVALID'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError('TOKEN_EXPIRED'));
    }
    return next(createError('INTERNAL_SERVER_ERROR', error.message));
  }
};

// Logout middleware
const logout = async (req, res, next) => {
  try {
    // This would typically involve blacklisting the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return next(createError('INTERNAL_SERVER_ERROR', error.message));
  }
};

export {
  authenticate,
  optionalAuth,
  authorize,
  checkOwnership,
  authenticateApiKey,
  checkApiKeyPermissions,
  requireEmailVerification,
  requireTwoFactor,
  requireSubscription,
  userRateLimit,
  checkSubscriptionLimits,
  deviceFingerprint,
  detectSuspiciousActivity,
  refreshToken,
  logout
};

export default authenticate;
