import helmet from 'helmet';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Security configuration
const SECURITY_CONFIG = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: []
    }
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: { policy: "require-corp" },

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frame Options
  frameguard: { action: 'deny' },

  // Hide Powered-By header
  hidePoweredBy: true,

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // IE Compatibility
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permissions Policy
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
      usb: ["'none'"],
      accelerometer: ["'none'"],
      gyroscope: ["'none'"],
      magnetometer: ["'none'"],
      fullscreen: ["'self'"],
      interestCohort: ["'none'"]
    }
  },

  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // X-Content-Type-Options
  xContentTypeOptions: true,

  // X-DNS-Prefetch-Control
  xDnsPrefetchControl: false,

  // X-Download-Options
  xDownloadOptions: false,

  // X-Frame-Options
  xFrameOptions: "DENY",

  // X-Permitted-Cross-Domain-Policies
  xPermittedCrossDomainPolicies: false,

  // X-XSS-Protection
  xXssProtection: "1; mode=block"
};

// Custom security headers
const customSecurityHeaders = (req, res, next) => {
  // Add custom security headers
  res.setHeader('X-Request-ID', crypto.randomBytes(16).toString('hex'));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  
  // Cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// IP whitelisting middleware
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No restrictions if whitelist is empty
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'Access denied from this IP address',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// API key authentication middleware
const apiKeyAuth = (validKeys = []) => {
  return (req, res, next) => {
    const apiKey = req.get('X-API-Key');
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'API key is required',
        timestamp: new Date().toISOString()
      });
    }

    if (!validKeys.includes(apiKey)) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid API key',
        timestamp: new Date().toISOString()
      });
    }

    req.apiKey = apiKey;
    next();
  };
};

// Request size limiter
const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: 'PAYLOAD_TOO_LARGE',
          message: `Request body too large. Maximum size is ${maxSize}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  };
};

// Helper function to parse size strings
const parseSize = (size) => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  if (!match) {
    throw new Error('Invalid size format');
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
};

// Method override protection
const methodOverrideProtection = (req, res, next) => {
  // Only allow actual HTTP methods, not method overrides
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  
  if (!allowedMethods.includes(req.method)) {
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'HTTP method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Content type validation
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next(); // Skip for methods that don't typically have bodies
    }

    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      return res.status(400).json({
        error: 'MISSING_CONTENT_TYPE',
        message: 'Content-Type header is required',
        timestamp: new Date().toISOString()
      });
    }

    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    
    if (!isAllowed) {
      return res.status(415).json({
        error: 'UNSUPPORTED_MEDIA_TYPE',
        message: `Content-Type ${contentType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

// User-Agent validation
const validateUserAgent = (options = {}) => {
  const {
    blockEmpty = true,
    blockBots = true,
    allowedPatterns = [],
    blockedPatterns = []
  } = options;

  return (req, res, next) => {
    const userAgent = req.get('User-Agent') || '';

    if (blockEmpty && !userAgent) {
      return res.status(400).json({
        error: 'INVALID_USER_AGENT',
        message: 'User-Agent header is required',
        timestamp: new Date().toISOString()
      });
    }

    if (blockBots) {
      const botPatterns = [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /curl/i,
        /wget/i,
        /python/i,
        /java/i,
        /go-http/i
      ];

      const isBot = botPatterns.some(pattern => pattern.test(userAgent));
      if (isBot) {
        return res.status(403).json({
          error: 'BOT_DETECTED',
          message: 'Automated requests are not allowed',
          timestamp: new Date().toISOString()
        });
      }
    }

    if (blockedPatterns.length > 0) {
      const isBlocked = blockedPatterns.some(pattern => pattern.test(userAgent));
      if (isBlocked) {
        return res.status(403).json({
          error: 'BLOCKED_USER_AGENT',
          message: 'This User-Agent is not allowed',
          timestamp: new Date().toISOString()
        });
      }
    }

    if (allowedPatterns.length > 0) {
      const isAllowed = allowedPatterns.some(pattern => pattern.test(userAgent));
      if (!isAllowed) {
        return res.status(403).json({
          error: 'UNAUTHORIZED_USER_AGENT',
          message: 'This User-Agent is not authorized',
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  };
};

// CORS security enhancements
const corsSecurity = (options = {}) => {
  const {
    allowedOrigins = [],
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge = 86400, // 24 hours
    credentials = false
  } = options;

  return (req, res, next) => {
    const origin = req.get('Origin');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', allowedMethods.join(', '));
      res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      res.header('Access-Control-Max-Age', maxAge.toString());
      
      if (credentials && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Credentials', 'true');
      }
    }

    // Set allowed origin
    if (allowedOrigins.length === 0 || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }

    // Additional CORS security
    res.header('Vary', 'Origin');
    res.header('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');

    next();
  };
};

// Security monitoring middleware
const securityMonitor = (options = {}) => {
  const {
    logSuspiciousRequests = true,
    blockSuspiciousRequests = false,
    suspiciousScoreThreshold = 50
  } = options;

  return (req, res, next) => {
    let suspiciousScore = 0;
    const reasons = [];

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /<script[^>]*>/i, score: 30, reason: 'XSS attempt' },
      { pattern: /javascript:/i, score: 25, reason: 'JavaScript protocol' },
      { pattern: /union\s+select/i, score: 35, reason: 'SQL injection attempt' },
      { pattern: /\/etc\/passwd/i, score: 30, reason: 'File inclusion attempt' },
      { pattern: /\.\./, score: 20, reason: 'Path traversal attempt' }
    ];

    const requestData = JSON.stringify({
      body: req.body,
      query: req.query,
      headers: req.headers
    });

    suspiciousPatterns.forEach(({ pattern, score, reason }) => {
      if (pattern.test(requestData)) {
        suspiciousScore += score;
        reasons.push(reason);
      }
    });

    // Check for missing headers
    if (!req.get('User-Agent')) {
      suspiciousScore += 15;
      reasons.push('Missing User-Agent');
    }

    // Check for very long URLs
    if (req.originalUrl && req.originalUrl.length > 1000) {
      suspiciousScore += 20;
      reasons.push('Suspiciously long URL');
    }

    // Log suspicious requests
    if (logSuspiciousRequests && suspiciousScore > 0) {
      console.warn(`🚨 Suspicious request detected: Score ${suspiciousScore} - ${reasons.join(', ')} | IP: ${req.ip} | URL: ${req.originalUrl}`);
    }

    // Block if score is too high
    if (blockSuspiciousRequests && suspiciousScore >= suspiciousScoreThreshold) {
      return res.status(403).json({
        error: 'SUSPICIOUS_REQUEST',
        message: 'Request blocked due to suspicious activity',
        timestamp: new Date().toISOString()
      });
    }

    req.securityScore = suspiciousScore;
    req.securityReasons = reasons;

    next();
  };
};

// Combine all security middleware
const securityMiddleware = [
  helmet(SECURITY_CONFIG),
  customSecurityHeaders,
  requestSizeLimit('10mb'),
  methodOverrideProtection,
  validateContentType(['application/json']),
  validateUserAgent({ blockEmpty: true, blockBots: true }),
  securityMonitor({ logSuspiciousRequests: true, blockSuspiciousRequests: false })
];

export {
  securityMiddleware,
  customSecurityHeaders,
  ipWhitelist,
  apiKeyAuth,
  requestSizeLimit,
  methodOverrideProtection,
  validateContentType,
  validateUserAgent,
  corsSecurity,
  securityMonitor,
  SECURITY_CONFIG
};

export default securityMiddleware;
