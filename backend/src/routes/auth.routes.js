import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  verifyEmail,
  resendEmailVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  deleteAccount,
  generateApiKey,
  listApiKeys,
  revokeApiKey
} from '../controllers/auth.controller.js';
import {
  validateRegister,
  validateLogin,
  validateResetPassword,
  optionalAuth,
  authenticate,
  checkOwnership
} from '../middleware/auth.middleware.js';
import {
  validateRegister as validateRegisterInput,
  validateLogin as validateLoginInput,
  validateResetPassword as validateResetInput
} from '../middleware/validation.middleware.js';
import {
  authLimiter,
  passwordResetLimiter,
  createStenLimiter
} from '../middleware/rateLimit.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';

const router = express.Router();

// Public routes (no authentication required)

// User registration
router.post('/register', 
  authLimiter,
  validateRegisterInput,
  asyncHandler(register)
);

// User login
router.post('/login',
  authLimiter,
  validateLoginInput,
  asyncHandler(login)
);

// Refresh access token
router.post('/refresh',
  asyncHandler(refreshToken)
);

// Email verification
router.get('/verify-email/:token',
  asyncHandler(verifyEmail)
);

// Resend email verification
router.post('/resend-verification',
  authLimiter,
  asyncHandler(resendEmailVerification)
);

// Forgot password
router.post('/forgot-password',
  passwordResetLimiter,
  asyncHandler(forgotPassword)
);

// Reset password
router.post('/reset-password',
  validateResetInput,
  asyncHandler(resetPassword)
);

// Protected routes (authentication required)

// Apply authentication middleware to all routes below this point
router.use(authenticate);

// User logout
router.post('/logout',
  asyncHandler(logout)
);

// Get current user profile
router.get('/profile',
  asyncHandler(getProfile)
);

// Update user profile
router.put('/profile',
  createStenLimiter, // Apply rate limiting to profile updates
  asyncHandler(updateProfile)
);

// Change password
router.post('/change-password',
  authLimiter,
  asyncHandler(changePassword)
);

// Delete account
router.delete('/account',
  authLimiter,
  asyncHandler(deleteAccount)
);

// API Key Management

// Generate new API key
router.post('/api-keys',
  createStenLimiter,
  asyncHandler(generateApiKey)
);

// List API keys
router.get('/api-keys',
  asyncHandler(listApiKeys)
);

// Revoke API key
router.delete('/api-keys/:keyId',
  asyncHandler(revokeApiKey)
);

// Health check for auth service
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'authentication',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
