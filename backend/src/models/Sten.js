import mongoose from "mongoose";

const stenSchema = new mongoose.Schema({
  // Optional title for the Sten
  title: {
    type: String,
    required: false,
    trim: true,
    maxlength: 200,
  },

  // Content storage - either plain or encrypted
  content: {
    type: String,
    required: function () {
      return !this.isPasswordProtected;
    },
  },
  encryptedMessage: {
    type: String,
    required: function () {
      return this.isPasswordProtected;
    },
  },
  iv: {
    type: String,
    required: function () {
      return this.isPasswordProtected;
    },
  },

  // Password protection flag
  isPasswordProtected: {
    type: Boolean,
    required: true,
    default: false,
  },

  // Password security fields (conditional)
  passwordHash: {
    type: String,
    required: function () {
      return this.isPasswordProtected;
    },
  },
  passwordSalt: {
    type: String,
    required: function () {
      return this.isPasswordProtected;
    },
  },

  // STEN configuration - null means unlimited views
  maxViews: {
    type: Number,
    required: false, // Make it optional to support null (unlimited)
    min: 1,
    default: 1,
    validate: {
      validator: function (v) {
        return v === null || (typeof v === "number" && v >= 1);
      },
      message: "maxViews must be null (unlimited) or a number >= 1",
    },
  },
  currentViews: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Expiration type
  expiresIn: {
    type: String,
    required: true,
    enum: ["1_hour", "24_hours", "7_days", "30_days"],
    default: "24_hours",
  },

  // Timing fields - expiresAt is calculated from expiresIn, not required in input
  expiresAt: {
    type: Date,
    required: false, // Will be calculated by pre-save middleware
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Security metadata
  securityLevel: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "high",
  },
  passwordStrength: {
    type: String,
    enum: ["none", "weak", "medium", "strong", "very-strong"],
    default: "medium",
  },
  // Optional logo URL (data URL or hosted asset)
  logoUrl: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100000, // Increased to support larger data URLs
  },
  // Optional description / rules for the Sten (visible before/after viewing)
  description: {
    type: String,
    required: false,
    trim: true,
    maxlength: 2000,
  },
  // Optional prize information (displayed with the Sten)
  prize: {
    type: String,
    required: false,
    trim: true,
    maxlength: 256,
  },
  // Character count of the secret content (auto-calculated when creating)
  charCount: {
    type: Number,
    required: false,
    min: 0,
  },
});

// Pre-save middleware to handle expiration logic
stenSchema.pre("save", function (next) {
  // Calculate expiresAt based on expiresIn type if not already set
  if (!this.expiresAt || this.isModified("expiresIn")) {
    const now = new Date();

    switch (this.expiresIn) {
      case "1_hour":
        this.expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "24_hours":
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "7_days":
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "30_days":
        this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        // Default to 24 hours if invalid type
        this.expiresIn = "24_hours";
        this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  next();
});

// Indexes for performance optimization
// TTL index for automatic cleanup of expired documents
stenSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

// Index for view limit checking
stenSchema.index({ currentViews: 1, maxViews: 1 });

// Index for chronological ordering
stenSchema.index({ createdAt: -1 });

// Index for password protection queries
stenSchema.index({ isPasswordProtected: 1 });

export default mongoose.model("Sten", stenSchema);
