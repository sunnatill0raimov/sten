import crypto from 'crypto';
import CRYPTO_CONFIG from '../../config/crypto.config.js';

/**
 * Key Management Utility
 * Handles secure key generation, rotation, and validation
 */
class KeyManager {
  /**
   * Generate a cryptographically secure random key
   * @param {number} length - Key length in bytes
   * @returns {string} Hex-encoded key
   */
  static generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Derive encryption key from user password and server secret
   * Uses PBKDF2 for key derivation with additional server-side secret
   * @param {string} password - User password
   * @param {Buffer} salt - Random salt
   * @returns {Buffer} Derived key
   */
  static deriveEncryptionKey(password, salt) {
    // First derive key from password
    const passwordKey = crypto.pbkdf2Sync(
      password,
      salt,
      CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      CRYPTO_CONFIG.PBKDF2_KEYLEN,
      CRYPTO_CONFIG.PBKDF2_DIGEST
    );

    // Then combine with server secret for additional security
    const combinedKey = Buffer.concat([
      passwordKey,
      CRYPTO_CONFIG.getKeyDerivationSecret()
    ]);

    // Final key derivation
    return crypto.pbkdf2Sync(
      combinedKey,
      crypto.randomBytes(16), // Additional salt
      CRYPTO_CONFIG.PBKDF2_ITERATIONS / 10, // Fewer iterations for performance
      CRYPTO_CONFIG.KEY_LENGTH,
      CRYPTO_CONFIG.PBKDF2_DIGEST
    );
  }

  /**
   * Generate secure IV for encryption
   * @returns {Buffer} Random IV
   */
  static generateIV() {
    return crypto.randomBytes(CRYPTO_CONFIG.IV_LENGTH);
  }

  /**
   * Generate secure salt for password hashing
   * @returns {Buffer} Random salt
   */
  static generateSalt() {
    return crypto.randomBytes(CRYPTO_CONFIG.SALT_LENGTH);
  }

  /**
   * Validate key format and length
   * @param {string} key - Hex-encoded key
   * @param {number} expectedLength - Expected length in bytes
   * @returns {boolean} Validity
   */
  static validateKey(key, expectedLength) {
    if (!key || typeof key !== 'string') return false;
    
    try {
      const buffer = Buffer.from(key, 'hex');
      return buffer.length === expectedLength;
    } catch {
      return false;
    }
  }

  /**
   * Get server encryption key from environment
   * @returns {Buffer} Server encryption key
   */
  static getServerEncryptionKey() {
    return CRYPTO_CONFIG.getEncryptionKey();
  }

  /**
   * Key rotation preparation
   * Returns both old and new keys for migration
   * @param {string} newEncryptionKey - New encryption key (optional)
   * @returns {Object} Migration keys
   */
  static prepareKeyRotation(newEncryptionKey = null) {
    const oldKey = this.getServerEncryptionKey();
    const newKey = newEncryptionKey ? Buffer.from(newEncryptionKey, 'hex') : this.generateSecureKey(32);

    return {
      oldKey: oldKey,
      newKey: Buffer.from(newKey, 'hex'),
      rotationTimestamp: new Date().toISOString()
    };
  }
}

export default KeyManager;
