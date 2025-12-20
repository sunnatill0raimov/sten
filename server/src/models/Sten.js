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
  
  // STEN configuration
  maxWinners: {
    type: Number,
    required: true,
    min: 1,
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
  
  // Timing fields
  expiresAt: {
    type: Date,
    required: true,
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
stenSchema.pre('save', function(next) {
  if (this.currentWinners >= this.maxWinners && !this.solved) {
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

// Indexes for performance optimization
// TTL index for automatic cleanup of expired documents
stenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for finding active STENs with available winner slots
stenSchema.index({ solved: 1, currentWinners: 1 });

// Index for chronological ordering
stenSchema.index({ createdAt: -1 });

// Index for one-time STEN queries
stenSchema.index({ oneTime: 1, solved: 1 });

export default mongoose.model('Sten', stenSchema);
