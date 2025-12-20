import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
  // Basic user information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  
  // Password and authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  
  passwordSalt: {
    type: String,
    required: true,
    select: false
  },
  
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  
  // User roles and status
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'locked'],
    default: 'active'
  },
  
  // Profile information
  profile: {
    firstName: { type: String, trim: true, maxlength: 50 },
    lastName: { type: String, trim: true, maxlength: 50 },
    bio: { type: String, maxlength: 500 },
    avatar: { type: String }, // URL to avatar image
    preferences: {
      theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
      notifications: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' }
    }
  },
  
  // Security and authentication tracking
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date
  },
  
  lastLogin: {
    type: Date
  },
  
  lastLoginIP: {
    type: String
  },
  
  passwordResetToken: {
    type: String,
    select: false
  },
  
  passwordResetExpires: {
    type: Date,
    select: false
  },
  
  emailVerificationToken: {
    type: String,
    select: false
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  emailVerifiedAt: {
    type: Date
  },
  
  // Two-factor authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  twoFactorSecret: {
    type: String,
    select: false
  },
  
  backupCodes: [{
    type: String,
    select: false
  }],
  
  // API keys
  apiKeys: [{
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    permissions: [{ type: String }], // Array of permissions
    lastUsed: { type: Date },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true }
  }],
  
  // Statistics
  stats: {
    stensCreated: { type: Number, default: 0 },
    stensSolved: { type: Number, default: 0 },
    totalWinnings: { type: Number, default: 0 },
    averageSolveTime: { type: Number, default: 0 }, // in milliseconds
    successRate: { type: Number, default: 0 }, // percentage
    lastActivity: { type: Date, default: Date.now }
  },
  
  // Security flags
  security: {
    suspiciousActivity: { type: Boolean, default: false },
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    trustedIPs: [{ type: String }],
    blockedIPs: [{ type: String }],
    lastSecurityCheck: { type: Date, default: Date.now }
  },
  
  // Subscription/Tier information (for future use)
  subscription: {
    tier: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
    startedAt: { type: Date },
    endsAt: { type: Date },
    features: [{ type: String }],
    limits: {
      maxStensPerDay: { type: Number, default: 10 },
      maxStensPerMonth: { type: Number, default: 100 },
      maxFileSize: { type: Number, default: 10485760 }, // 10MB
      apiCallsPerHour: { type: Number, default: 100 }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'profile.email': 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'stats.lastActivity': -1 });
userSchema.index({ 'subscription.tier': 1 });

// Virtual fields
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.username;
});

userSchema.virtual('accountAge').get(function() {
  return Date.now() - this.createdAt;
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Hash password if it's modified
  if (this.isModified('password')) {
    // Validate password strength
    const passwordStrength = this.validatePasswordStrength(this.password);
    if (passwordStrength.strength === 'weak') {
      return next(new Error(`Password is too weak: ${passwordStrength.recommendations.join(', ')}`));
    }
    
    // Generate salt and hash password
    const salt = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(this.password + salt, 12);
    
    this.password = hashedPassword;
    this.passwordSalt = salt;
    this.passwordChangedAt = new Date();
    
    // Invalidate all sessions
    this.passwordResetToken = undefined;
    this.passwordResetExpires = undefined;
  }
  
  // Update username/email to lowercase
  if (this.isModified('username')) {
    this.username = this.username.toLowerCase();
  }
  
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
    this.emailVerified = false;
    this.emailVerifiedAt = undefined;
  }
  
  next();
});

// Instance methods

// Password strength validation
userSchema.methods.validatePasswordStrength = function(password) {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noCommonPatterns: !/(password|123456|qwerty|admin)/i.test(password)
  };

  const score = Object.values(checks).filter(Boolean).length;
  
  let strength;
  if (score <= 2) strength = 'weak';
  else if (score <= 4) strength = 'medium';
  else if (score <= 5) strength = 'strong';
  else strength = 'very-strong';

  const recommendations = [];
  if (!checks.length) recommendations.push('Use at least 8 characters');
  if (!checks.lowercase) recommendations.push('Include lowercase letters');
  if (!checks.uppercase) recommendations.push('Include uppercase letters');
  if (!checks.numbers) recommendations.push('Include numbers');
  if (!checks.special) recommendations.push('Include special characters');
  if (!checks.noCommonPatterns) recommendations.push('Avoid common patterns');

  return { strength, score, checks, recommendations };
};

// Password verification
userSchema.methods.verifyPassword = async function(candidatePassword) {
  if (!this.password || !this.passwordSalt) {
    return false;
  }
  
  try {
    return await bcrypt.compare(candidatePassword + this.passwordSalt, this.password);
  } catch (error) {
    return false;
  }
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If previous lock has expired, restart count
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  return verificationToken;
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    subscription: this.subscription.tier
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'sten-api',
    audience: 'sten-users'
  });
};

// Generate API key
userSchema.methods.generateApiKey = function(name, permissions = [], expiresIn = null) {
  const apiKey = crypto.randomBytes(32).toString('hex');
  const keyId = crypto.randomBytes(8).toString('hex');
  
  const fullKey = `sk_${keyId}_${apiKey}`;
  
  const keyObject = {
    name,
    key: fullKey,
    permissions,
    createdAt: new Date(),
    lastUsed: null,
    isActive: true
  };
  
  if (expiresIn) {
    keyObject.expiresAt = new Date(Date.now() + expiresIn);
  }
  
  this.apiKeys.push(keyObject);
  
  return fullKey;
};

// Revoke API key
userSchema.methods.revokeApiKey = function(keyId) {
  this.apiKeys = this.apiKeys.filter(key => 
    key.key.split('_')[1] !== keyId
  );
  
  return this.save();
};

// Update statistics
userSchema.methods.updateStats = function(action, value = 1) {
  switch (action) {
    case 'sten_created':
      this.stats.stensCreated += value;
      break;
    case 'sten_solved':
      this.stats.stensSolved += value;
      break;
    case 'winnings_added':
      this.stats.totalWinnings += value;
      break;
    case 'last_activity':
      this.stats.lastActivity = new Date();
      break;
  }
  
  // Calculate success rate
  if (this.stats.stensCreated > 0) {
    this.stats.successRate = (this.stats.stensSolved / this.stats.stensCreated) * 100;
  }
  
  return this.save();
};

// Check subscription limits
userSchema.methods.checkSubscriptionLimit = function(action, value = 1) {
  const limits = this.subscription.limits;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  switch (action) {
    case 'stens_per_day':
      // Check daily limit
      return this.stats.stensCreated >= limits.maxStensPerDay;
      
    case 'stens_per_month':
      // Check monthly limit
      return this.stats.stensCreated >= limits.maxStensPerMonth;
      
    case 'api_calls_per_hour':
      // This would need to be implemented with rate limiting
      return false;
      
    default:
      return false;
  }
};

// Static methods

// Find user by credentials
userSchema.statics.findByCredentials = async function(identifier, password) {
  const user = await this.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { email: identifier.toLowerCase() }
    ]
  }).select('+password +passwordSalt +loginAttempts +lockUntil');
  
  if (!user) {
    return null;
  }
  
  // Check if account is locked
  if (user.isLocked) {
    return null;
  }
  
  // Check password
  const isMatch = await user.verifyPassword(password);
  
  if (!isMatch) {
    await user.incLoginAttempts();
    return null;
  }
  
  // Reset login attempts on successful login
  await user.resetLoginAttempts();
  
  // Update last login info
  await user.updateOne({
    lastLogin: new Date(),
    'stats.lastActivity': new Date()
  });
  
  return user;
};

// Find user by verification token
userSchema.statics.findByVerificationToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerified: false
  });
};

// Find user by password reset token
userSchema.statics.findByResetToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  return this.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+passwordResetToken +passwordResetExpires');
};

// Validate API key
userSchema.statics.findByApiKey = function(apiKey) {
  const [prefix, keyId, key] = apiKey.split('_');
  
  if (prefix !== 'sk' || !keyId || !key) {
    return null;
  }
  
  return this.findOne({
    'apiKeys.key': apiKey,
    'apiKeys.isActive': true,
    $or: [
      { 'apiKeys.expiresAt': { $exists: false } },
      { 'apiKeys.expiresAt': { $gt: new Date() } }
    ]
  });
};

export default mongoose.model('User', userSchema);
