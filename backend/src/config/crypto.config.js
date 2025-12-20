import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Crypto configuration from environment variables
const CRYPTO_CONFIG = {
  // Server-side encryption key (32 bytes for AES-256)
  ENCRYPTION_KEY: process.env.STEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
  
  // Key derivation secret for additional security layer
  KEY_DERIVATION_SECRET: process.env.STEN_KEY_DERIVATION_SECRET || crypto.randomBytes(64).toString('hex'),
  
  // Encryption algorithm
  ALGORITHM: process.env.STEN_ALGORITHM || 'aes-256-cbc',
  
  // Key and IV lengths
  KEY_LENGTH: 32, // 256 bits for AES-256
  IV_LENGTH: 16,  // 128 bits for AES
  
  // PBKDF2 settings for password hashing
  PBKDF2_ITERATIONS: 100000,
  PBKDF2_KEYLEN: 64,
  PBKDF2_DIGEST: 'sha256',
  SALT_LENGTH: 32,
  
  // Validation
  validate() {
    const errors = [];
    
    if (!this.ENCRYPTION_KEY || this.ENCRYPTION_KEY.length < 64) {
      errors.push('ENCRYPTION_KEY must be at least 64 hex characters (32 bytes)');
    }
    
    if (!this.KEY_DERIVATION_SECRET || this.KEY_DERIVATION_SECRET.length < 128) {
      errors.push('KEY_DERIVATION_SECRET must be at least 128 hex characters (64 bytes)');
    }
    
    if (errors.length > 0) {
      throw new Error(`Crypto configuration errors: ${errors.join(', ')}`);
    }
    
    return true;
  },
  
  // Get encryption key as Buffer
  getEncryptionKey() {
    return Buffer.from(this.ENCRYPTION_KEY, 'hex');
  },
  
  // Get key derivation secret as Buffer
  getKeyDerivationSecret() {
    return Buffer.from(this.KEY_DERIVATION_SECRET, 'hex');
  }
};

// Validate configuration on import
try {
  CRYPTO_CONFIG.validate();
} catch (error) {
  console.warn('Crypto configuration warning:', error.message);
  console.warn('Using temporary keys - NOT RECOMMENDED FOR PRODUCTION');
}

export default CRYPTO_CONFIG;
