import User from '../models/User.js';
import { createError, createSuccessResponse, asyncHandler } from '../middleware/error.middleware.js';
import { validateRegister, validateLogin, validateResetPassword } from '../middleware/validation.middleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimit.middleware.js';

// User registration
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { username: username.toLowerCase() },
      { email: email.toLowerCase() }
    ]
  });

  if (existingUser) {
    if (existingUser.username.toLowerCase() === username.toLowerCase()) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_USERNAME',
        message: 'Username already taken'
      });
    }
    if (existingUser.email.toLowerCase() === email.toLowerCase()) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: 'Email already registered'
      });
    }
  }

  // Create new user
  const user = new User({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    profile: {
      firstName,
      lastName
    }
  });

  // Generate email verification token
  const verificationToken = user.createEmailVerificationToken();

  await user.save();

  // TODO: Send verification email
  console.log(`Email verification token for ${user.email}: ${verificationToken}`);

  res.status(201).json(createSuccessResponse({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      emailVerified: user.emailVerified
    }
  }, 'User registered successfully. Please check your email for verification.'));
});

// User login
export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  // Find user by credentials
  const user = await User.findByCredentials(identifier, password);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid username/email or password'
    });
  }

  // Generate tokens
  const accessToken = user.generateAuthToken();
  const refreshToken = jwt.sign(
    { id: user._id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d', issuer: 'sten-api', audience: 'sten-refresh' }
  );

  // Update last login info
  user.lastLogin = new Date();
  user.lastLoginIP = req.ip;
  await user.save();

  res.json(createSuccessResponse({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      emailVerified: user.emailVerified,
      subscription: user.subscription,
      stats: user.stats
    },
    tokens: {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  }, 'Login successful'));
});

// Refresh token
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Refresh token is required'
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      issuer: 'sten-api',
      audience: 'sten-refresh'
    });

    const user = await User.findById(decoded.id);

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_INVALID',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newAccessToken = user.generateAuthToken();
    const newRefreshToken = jwt.sign(
      { id: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d', issuer: 'sten-api', audience: 'sten-refresh' }
    );

    res.json(createSuccessResponse({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    }, 'Tokens refreshed successfully'));

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_INVALID',
        message: 'Invalid refresh token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Refresh token expired'
      });
    }
    throw error;
  }
});

// User logout
export const logout = asyncHandler(async (req, res) => {
  // In a real implementation, you would:
  // 1. Add the token to a blacklist
  // 2. Clear any session data
  // 3. Log the logout event
  
  res.json(createSuccessResponse(null, 'Logged out successfully'));
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findByVerificationToken(token);

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired verification token'
    });
  }

  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationToken = undefined;

  await user.save();

  res.json(createSuccessResponse(null, 'Email verified successfully'));
});

// Resend email verification
export const resendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists or not
    return res.json(createSuccessResponse(null, 'If the email exists, a verification email has been sent'));
  }

  if (user.emailVerified) {
    return res.status(400).json({
      success: false,
      error: 'ALREADY_VERIFIED',
      message: 'Email is already verified'
    });
  }

  // Generate new verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save();

  // TODO: Send verification email
  console.log(`Email verification token for ${user.email}: ${verificationToken}`);

  res.json(createSuccessResponse(null, 'Verification email sent successfully'));
});

// Forgot password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if user exists or not
    return res.json(createSuccessResponse(null, 'If the email exists, a password reset email has been sent'));
  }

  // Generate password reset token
  const resetToken = user.createPasswordResetToken();
  await user.save();

  // TODO: Send password reset email
  console.log(`Password reset token for ${user.email}: ${resetToken}`);

  res.json(createSuccessResponse(null, 'Password reset email sent successfully'));
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await User.findByResetToken(token);

  if (!user) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired reset token'
    });
  }

  // Update password
  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date();

  // Reset login attempts
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  await user.save();

  res.json(createSuccessResponse(null, 'Password reset successfully'));
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  // Verify current password
  const isCurrentPasswordValid = await req.user.verifyPassword(currentPassword);

  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Current password is incorrect'
    });
  }

  // Update password
  req.user.password = newPassword;
  await req.user.save();

  res.json(createSuccessResponse(null, 'Password changed successfully'));
});

// Get current user profile
export const getProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  const user = await User.findById(req.user._id)
    .select('-password -passwordSalt -passwordResetToken -passwordResetExpires -emailVerificationToken -twoFactorSecret -backupCodes');

  res.json(createSuccessResponse({
    user
  }, 'Profile retrieved successfully'));
});

// Update user profile
export const updateProfile = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  const { firstName, lastName, bio, preferences } = req.body;
  const user = await User.findById(req.user._id);

  // Update allowed fields
  if (firstName !== undefined) user.profile.firstName = firstName;
  if (lastName !== undefined) user.profile.lastName = lastName;
  if (bio !== undefined) user.profile.bio = bio;
  if (preferences !== undefined) {
    user.profile.preferences = { ...user.profile.preferences, ...preferences };
  }

  await user.save();

  res.json(createSuccessResponse({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      emailVerified: user.emailVerified,
      subscription: user.subscription,
      stats: user.stats
    }
  }, 'Profile updated successfully'));
});

// Delete user account
export const deleteAccount = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  const { password } = req.body;

  // Verify password for account deletion
  const isPasswordValid = await req.user.verifyPassword(password);

  if (!isPasswordValid) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PASSWORD',
      message: 'Password is required to delete account'
    });
  }

  // Soft delete by marking as inactive
  req.user.status = 'inactive';
  req.user.email = `deleted_${Date.now()}_${req.user.email}`;
  await req.user.save();

  res.json(createSuccessResponse(null, 'Account deleted successfully'));
});

// Generate API key
export const generateApiKey = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  const { name, permissions, expiresIn } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'API key name is required'
    });
  }

  const user = await User.findById(req.user._id);
  const apiKey = user.generateApiKey(name, permissions, expiresIn);
  await user.save();

  res.status(201).json(createSuccessResponse({
    apiKey: {
      name,
      key: apiKey,
      permissions,
      createdAt: new Date(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : null
    }
  }, 'API key generated successfully'));
});

// List API keys
export const listApiKeys = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  const user = await User.findById(req.user._id)
    .select('apiKeys');

  const apiKeys = user.apiKeys.map(key => ({
    name: key.name,
    permissions: key.permissions,
    lastUsed: key.lastUsed,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    isActive: key.isActive
  }));

  res.json(createSuccessResponse({
    apiKeys
  }, 'API keys retrieved successfully'));
});

// Revoke API key
export const revokeApiKey = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'Authentication required'
    });
  }

  const { keyId } = req.params;

  const user = await User.findById(req.user._id);
  
  // Find and remove the API key
  const keyIndex = user.apiKeys.findIndex(key => 
    key.key.split('_')[1] === keyId
  );

  if (keyIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: 'API key not found'
    });
  }

  user.apiKeys.splice(keyIndex, 1);
  await user.save();

  res.json(createSuccessResponse(null, 'API key revoked successfully'));
});
