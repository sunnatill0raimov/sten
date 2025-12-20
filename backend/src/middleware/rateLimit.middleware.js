import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client for rate limiting
let redisClient;

// Initialize Redis if configured
if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });

  redisClient.on('error', (err) => {
    console.warn('Redis rate limiter connection error, falling back to memory store:', err.message);
    redisClient = null;
  });

  redisClient.on('connect', () => {
    console.log('Redis rate limiter connected');
  });
}

// Custom rate limiter factory
const createRateLimiter = (options = {}) => {
  const config = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: redisClient ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      client: redisClient
    }) : 'memoryStore',
    keyGenerator: (req) => {
      // Use IP address as default key
      return req.ip || req.connection.remoteAddress;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/v1/health';
    },
    ...options
  };

  return rateLimit(config);
};

// Specific rate limiters for different endpoints

// General API rate limiter
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes',
    code: 'GENERAL_RATE_LIMIT_EXCEEDED',
    retryAfter: 900
  }
});

// Sten creation rate limiter (more restrictive)
export const createStenLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 STENs per 15 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many STENs created, please try again after 15 minutes',
    code: 'CREATE_STEN_RATE_LIMIT_EXCEEDED',
    retryAfter: 900
  },
  keyGenerator: (req) => {
    // Rate limit by IP and user ID if authenticated
    const userId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress;
    return userId ? `user:${userId}` : `ip:${ip}`;
  }
});

// Sten solving rate limiter
export const solveStenLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many solve attempts, please try again after 15 minutes',
    code: 'SOLVE_STEN_RATE_LIMIT_EXCEEDED',
    retryAfter: 900
  },
  keyGenerator: (req) => {
    // Rate limit by IP and user ID if authenticated
    const userId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress;
    return userId ? `user:${userId}` : `ip:${ip}`;
  }
});

// Authentication rate limiter (very restrictive)
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per 15 minutes
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts, please try again after 15 minutes',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 900
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Rate limit by IP and username/email combination
    const username = req.body?.username || req.body?.email;
    const ip = req.ip || req.connection.remoteAddress;
    return username ? `auth:${username}:${ip}` : `auth:${ip}`;
  }
});

// Password reset rate limiter
export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password resets per hour
  message: {
    error: 'Too Many Requests',
    message: 'Too many password reset attempts, please try again after 1 hour',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    retryAfter: 3600
  },
  keyGenerator: (req) => {
    const email = req.body?.email;
    const ip = req.ip || req.connection.remoteAddress;
    return email ? `reset:${email}` : `reset:${ip}`;
  }
});

// Admin rate limiter (permissive for authenticated admins)
export const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes for admins
  message: {
    error: 'Too Many Requests',
    message: 'Admin rate limit exceeded, please try again later',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED',
    retryAfter: 900
  },
  keyGenerator: (req) => {
    // Rate limit by admin user ID
    const userId = req.user?.id;
    return userId ? `admin:${userId}` : `admin:${req.ip}`;
  },
  skip: (req) => {
    // Skip if not authenticated as admin
    return !req.user || req.user.role !== 'admin';
  }
});

// Dynamic rate limiter based on user tier
export const dynamicLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    // Different limits based on user role or subscription tier
    const user = req.user;
    if (!user) return 50; // Unauthenticated users
    
    switch (user.role) {
      case 'admin':
        return 500;
      case 'premium':
        return 200;
      case 'user':
        return 100;
      default:
        return 50;
    }
  },
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded based on your account tier',
    code: 'DYNAMIC_RATE_LIMIT_EXCEEDED'
  }
});

// Rate limit status middleware
export const rateLimitStatus = (req, res, next) => {
  res.on('finish', () => {
    const rateLimitInfo = res.get('X-RateLimit-Limit');
    const rateLimitRemaining = res.get('X-RateLimit-Remaining');
    const rateLimitReset = res.get('X-RateLimit-Reset');

    if (rateLimitInfo) {
      console.log(`Rate limit for ${req.ip}: ${rateLimitRemaining}/${rateLimitInfo}, resets at ${new Date(parseInt(rateLimitReset) * 1000).toISOString()}`);
    }
  });
  next();
};

// Cleanup function for Redis connection
export const cleanupRateLimiters = () => {
  if (redisClient) {
    redisClient.disconnect();
    console.log('Redis rate limiter disconnected');
  }
};

// Graceful shutdown
process.on('SIGTERM', cleanupRateLimiters);
process.on('SIGINT', cleanupRateLimiters);

export {
  createRateLimiter,
  redisClient
};
