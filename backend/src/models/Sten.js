import mongoose from 'mongoose';

const stenSchema = new mongoose.Schema({
  // Content storage - either plain or encrypted
  content: {
    type: String,
    required: function() { return !this.isPasswordProtected; }
  },
  encryptedMessage: {
    type: String,
    required: function() { return this.isPasswordProtected; }
  },
  iv: {
    type: String,
    required: function() { return this.isPasswordProtected; }
  },
  
  // Password protection flag
  isPasswordProtected: {
    type: Boolean,
    required: true,
    default: false
  },
  
  // Password security fields (conditional)
  passwordHash: {
    type: String,
    required: function() { return this.isPasswordProtected; }
  },
  passwordSalt: {
    type: String,
    required: function() { return this.isPasswordProtected; }
  },
  
  // STEN configuration - null means unlimited winners
  maxWinners: {
    type: Number,
    required: false, // Make it optional to support null
    min: 1,
    default: 1,
    validate: {
      validator: function(v) {
        return v === null || (typeof v === 'number' && v >= 1);
      },
      message: 'maxWinners must be null (unlimited) or a number >= 1'
    }
  },
  currentWinners: {
    type: Number,
    default: 0,
    min: 0,
  },
  oneTime: {
    type: Boolean,
    default: false,
  },
  
  // New: Expiration type
  expiresIn: {
    type: String,
    required: true,
    enum: ['after_viewing', '1_hour', '24_hours', '7_days', '30_days'],
    default: '24_hours'
  },
  
  // Timing fields - expiresAt can be null for after_viewing
  expiresAt: {
    type: Date,
    required: function() { return this.expiresIn !== 'after_viewing'; }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  // Status tracking
  solved: {
    type: Boolean,
    default: false,
  },
  solvedBy: [{
    type: String, // Array of user IDs
  }],
  
  // Optional security metadata
  securityLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'high'
  },
  passwordStrength: {
    type: String,
    enum: ['none', 'weak', 'medium', 'strong', 'very-strong'],
    default: 'medium'
  }
});

// Pre-save middleware to automatically set solved to true when currentWinners reaches maxWinners
// Only applies if maxWinners is not null (unlimited)
stenSchema.pre('save', function(next) {
  if (this.maxWinners && this.currentWinners >= this.maxWinners && !this.solved) {
    this.solved = true;
  }
  next();
});

// Pre-save middleware for one-time STENs
stenSchema.pre('save', function(next) {
  // If this is a one-time STEN and someone has solved it, mark as solved
  if (this.oneTime && this.currentWinners >= 1 && !this.solved) {
    this.solved = true;
  }
  next();
});

// Validation to ensure maxWinners is 1 for one-time STENs
stenSchema.pre('validate', function(next) {
  if (this.oneTime && this.maxWinners > 1) {
    this.maxWinners = 1;
  }
  next();
});

// New: Handle expiration type logic
stenSchema.pre('save', function(next) {
  // For after_viewing, expiresAt should be null
  if (this.expiresIn === 'after_viewing') {
    this.expiresAt = null;
  }
  
  // For one-time STENs, force expiration to after_viewing
  if (this.oneTime && this.expiresIn !== 'after_viewing') {
    this.expiresIn = 'after_viewing';
    this.expiresAt = null;
  }
  
  next();
});

// Indexes for performance optimization
// TTL index for automatic cleanup of expired documents (only for documents with expiresAt)
stenSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { expiresAt: { $ne: null } }
});

// Compound index for finding active STENs with available winner slots
stenSchema.index({ solved: 1, currentWinners: 1 });

// Index for expiration type queries
stenSchema.index({ expiresIn: 1 });

// Index for chronological ordering
stenSchema.index({ createdAt: -1 });

// Index for one-time STEN queries
stenSchema.index({ oneTime: 1, solved: 1 });

// Index for winner limit checking
stenSchema.index({ currentWinners: 1, maxWinners: 1 });

export default mongoose.model('Sten', stenSchema);
