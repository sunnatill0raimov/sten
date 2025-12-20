import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  userId: { type: String, required: false }, // Optional for unauthenticated requests
  sessionId: { type: String, required: false }, // Session tracking
  action: { type: String, required: true }, // Action performed
  resource: { type: String, required: true }, // Resource type (sten, user, auth, admin)
  resourceId: { type: String, required: false }, // Specific resource ID
  method: { type: String, required: true }, // HTTP method
  endpoint: { type: String, required: true }, // API endpoint
  ip: { type: String, required: true },
  userAgent: { type: String, required: false },
  success: { type: Boolean, required: true },
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true }, // Response time in milliseconds
  
  // Request/Response data (sanitized)
  request: {
    body: { type: mongoose.Schema.Types.Mixed, required: false },
    query: { type: mongoose.Schema.Types.Mixed, required: false },
    params: { type: mongoose.Schema.Types.Mixed, required: false },
    headers: { type: mongoose.Schema.Types.Mixed, required: false }
  },
  
  response: {
    body: { type: mongoose.Schema.Types.Mixed, required: false },
    headers: { type: mongoose.Schema.Types.Mixed, required: false }
  },
  
  // Error information
  error: {
    message: { type: String, required: false },
    stack: { type: String, required: false },
    code: { type: String, required: false }
  },
  
  // Security relevant information
  security: {
    suspicious: { type: Boolean, default: false },
    threats: [{ type: String }], // Array of detected threat types
    riskScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  // Geographic information (if available)
  location: {
    country: { type: String },
    city: { type: String },
    latitude: { type: Number },
    longitude: { type: Number }
  },
  
  timestamp: { type: Date, default: Date.now }
});

// Indexes for performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });
auditLogSchema.index({ ip: 1, timestamp: -1 });
auditLogSchema.index({ 'security.suspicious': 1, timestamp: -1 });
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // TTL: 1 year

// Create or get the model
const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

// Utility functions for data sanitization
const sanitizeData = (data, maxDepth = 3, currentDepth = 0) => {
  if (currentDepth >= maxDepth) return '[Max Depth Reached]';
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Mask sensitive information
    return data
      .replace(/password/i, '******')
      .replace(/token/i, '******')
      .replace(/secret/i, '******')
      .replace(/key/i, '******')
      .replace(/authorization/i, '******')
      .replace(/bearer/i, '******');
  }
  
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item, maxDepth, currentDepth + 1));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys entirely
      if (/password|token|secret|key|authorization|bearer/i.test(key)) {
        sanitized[key] = '******';
      } else {
        sanitized[key] = sanitizeData(value, maxDepth, currentDepth + 1);
      }
    }
    return sanitized;
  }
  
  return data;
};

// Security threat detection
const detectThreats = (req, res, statusCode, responseTime) => {
  const threats = [];
  let riskScore = 0;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script[^>]*>/i,          // XSS
    /javascript:/i,             // JavaScript protocol
    /on\w+\s*=/i,            // Event handlers
    /union\s+select/i,         // SQL injection
    /drop\s+table/i,          // SQL injection
    /exec\s*\(/i,             // Code execution
    /\.\./,                   // Path traversal
    /\/etc\/passwd/i,         // File inclusion
    /cmd\.exe/i,              // Command injection
  ];
  
  // Check request body, query, and headers
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(requestData)) {
      threats.push(`Suspicious pattern detected: ${pattern.source}`);
      riskScore += 20;
    }
  });
  
  // Check for unusual response times
  if (responseTime > 5000) { // 5 seconds
    threats.push('Unusual response time');
    riskScore += 10;
  }
  
  // Check for error status codes
  if (statusCode >= 400) {
    threats.push(`HTTP Error: ${statusCode}`);
    riskScore += statusCode >= 500 ? 15 : 5;
  }
  
  // Check for unusual user agents
  const userAgent = req.get('User-Agent');
  if (!userAgent || userAgent.length < 10) {
    threats.push('Suspicious User-Agent');
    riskScore += 15;
  }
  
  // Check for rapid requests (would need Redis/memory store for proper implementation)
  // This is a placeholder for now
  
  return {
    suspicious: threats.length > 0 || riskScore > 30,
    threats,
    riskScore: Math.min(riskScore, 100)
  };
};

// Generate session ID
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Main audit middleware factory
const auditMiddleware = (options = {}) => {
  const {
    logRequestBody = true,
    logResponseBody = false,
    logHeaders = true,
    skipHealthChecks = true,
    skipSuccessfulRequests = false,
    minResponseTime = 100 // Only log requests taking longer than this
  } = options;
  
  return (req, res, next) => {
    // Skip health checks if configured
    if (skipHealthChecks && (req.path === '/health' || req.path === '/api/v1/health')) {
      return next();
    }
    
    const startTime = Date.now();
    const sessionId = generateSessionId();
    
    // Store original res methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData = null;
    let isResponseLogged = false;
    
    // Override res.send and res.json to capture response data
    const logResponse = (data) => {
      if (!isResponseLogged) {
        isResponseLogged = true;
        
        try {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          // Skip if response time is too fast (configurable)
          if (responseTime < minResponseTime && res.statusCode < 400 && skipSuccessfulRequests) {
            return;
          }
          
          // Detect security threats
          const security = detectThreats(req, res, res.statusCode, responseTime);
          
          // Prepare audit log entry
          const auditEntry = {
            userId: req.user?.id || null,
            sessionId,
            action: determineAction(req, res),
            resource: determineResource(req),
            resourceId: req.params.id || req.params.userId || null,
            method: req.method,
            endpoint: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            success: res.statusCode < 400,
            statusCode: res.statusCode,
            responseTime,
            
            request: {
              body: logRequestBody ? sanitizeData(req.body) : undefined,
              query: logRequestBody ? sanitizeData(req.query) : undefined,
              params: logRequestBody ? sanitizeData(req.params) : undefined,
              headers: logHeaders ? sanitizeData(req.headers) : undefined
            },
            
            response: logResponseBody ? {
              body: sanitizeData(data),
              headers: res.getHeaders()
            } : undefined,
            
            error: res.statusCode >= 400 ? {
              message: data?.message || 'Unknown error',
              code: data?.code || 'UNKNOWN_ERROR'
            } : undefined,
            
            security
          };
          
          // Create audit log entry asynchronously
          AuditLog.create(auditEntry).catch(err => {
            console.error('Failed to create audit log:', err.message);
          });
          
          // Log suspicious activity immediately
          if (security.suspicious) {
            console.warn(`🚨 Suspicious activity detected: ${security.threats.join(', ')} | IP: ${auditEntry.ip} | Endpoint: ${auditEntry.endpoint}`);
          }
          
        } catch (error) {
          console.error('Audit middleware error:', error.message);
        }
      }
    };
    
    // Override response methods
    res.send = function(data) {
      responseData = data;
      logResponse(data);
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      responseData = data;
      logResponse(data);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Helper functions to determine action and resource
const determineAction = (req, res) => {
  const method = req.method;
  const path = req.path;
  
  if (path.includes('/auth/')) {
    if (path.includes('/login')) return 'AUTH_LOGIN';
    if (path.includes('/register')) return 'AUTH_REGISTER';
    if (path.includes('/logout')) return 'AUTH_LOGOUT';
    if (path.includes('/reset')) return 'AUTH_RESET';
  }
  
  if (path.includes('/sten/')) {
    if (path.includes('/create')) return 'STEN_CREATE';
    if (path.includes('/solve')) return 'STEN_SOLVE';
    if (path.includes('/view')) return 'STEN_VIEW';
    if (method === 'DELETE') return 'STEN_DELETE';
    if (method === 'GET') return 'STEN_READ';
    if (method === 'PUT') return 'STEN_UPDATE';
  }
  
  if (path.includes('/admin/')) {
    return 'ADMIN_ACTION';
  }
  
  return `${method}_${path.split('/')[1]?.toUpperCase() || 'UNKNOWN'}`;
};

const determineResource = (req) => {
  const path = req.path;
  
  if (path.includes('/auth/')) return 'auth';
  if (path.includes('/sten/')) return 'sten';
  if (path.includes('/admin/')) return 'admin';
  if (path.includes('/user/')) return 'user';
  
  return 'unknown';
};

// Query helpers for audit logs
export const getAuditLogs = async (filters = {}, options = {}) => {
  const {
    userId,
    action,
    resource,
    ip,
    startDate,
    endDate,
    suspicious,
    minRiskScore
  } = filters;
  
  const {
    limit = 100,
    skip = 0,
    sort = { timestamp: -1 }
  } = options;
  
  const query = {};
  
  if (userId) query.userId = userId;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  if (ip) query.ip = ip;
  if (suspicious !== undefined) query['security.suspicious'] = suspicious;
  if (minRiskScore) query['security.riskScore'] = { $gte: minRiskScore };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return await AuditLog
    .find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();
};

export const getSecurityStats = async (timeRange = '24h') => {
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case '1h':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  const stats = await AuditLog.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successfulRequests: { $sum: { $cond: ['$success', 1, 0] } },
        failedRequests: { $sum: { $cond: ['$success', 0, 1] } },
        suspiciousRequests: { $sum: { $cond: ['$security.suspicious', 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
        maxRiskScore: { $max: '$security.riskScore' },
        uniqueIPs: { $addToSet: '$ip' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        totalRequests: 1,
        successfulRequests: 1,
        failedRequests: 1,
        suspiciousRequests: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        maxRiskScore: 1,
        uniqueIPs: { $size: '$uniqueIPs' },
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    }
  ]);
  
  return stats[0] || {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    suspiciousRequests: 0,
    avgResponseTime: 0,
    maxRiskScore: 0,
    uniqueIPs: 0,
    uniqueUsers: 0
  };
};

export default auditMiddleware;
export { AuditLog, auditLogSchema };
