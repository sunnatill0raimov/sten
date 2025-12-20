import crypto from 'crypto';
import CRYPTO_CONFIG from '../../config/crypto.config.js';
import KeyManager from './keyManager.js';

/**
 * Password Hashing Utility
 * Handles secure password hashing and verification using PBKDF2
 */
class Hashing {
  /**
   * Hash a password using PBKDF2 with embedded salt
   * @param {string} password - Plain text password to hash
   * @returns {Object} Hashed password with salt and metadata
   */
  static hashPassword(password) {
    try {
      // Validate input
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      // Generate random salt
      const salt = KeyManager.generateSalt();
      
      // Hash password with PBKDF2
      const hash = crypto.pbkdf2Sync(
        password,
        salt,
        CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        CRYPTO_CONFIG.PBKDF2_KEYLEN,
        CRYPTO_CONFIG.PBKDF2_DIGEST
      );

      return {
        hash: hash.toString('base64'),
        salt: salt.toString('base64'),
        iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        algorithm: CRYPTO_CONFIG.PBKDF2_DIGEST,
        keyLength: CRYPTO_CONFIG.PBKDF2_KEYLEN,
        version: 'v1', // For future algorithm updates
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify a password against a stored hash
   * @param {string} password - Plain text password to verify
   * @param {Object} storedHashObj - Stored hash object
   * @returns {boolean} Password validity
   */
  static verifyPassword(password, storedHashObj) {
    try {
      // Validate inputs
      if (!password || !storedHashObj || !storedHashObj.hash || !storedHashObj.salt) {
        return false;
      }

      const { hash: storedHash, salt, iterations, algorithm, keyLength } = storedHashObj;
      
      // Extract hash parameters
      const hashBuffer = Buffer.from(storedHash, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');
      
      // Hash the provided password with same parameters
      const testHash = crypto.pbkdf2Sync(
        password,
        saltBuffer,
        iterations || CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        keyLength || CRYPTO_CONFIG.PBKDF2_KEYLEN,
        algorithm || CRYPTO_CONFIG.PBKDF2_DIGEST
      );

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(hashBuffer, testHash);
    } catch (error) {
      // Log error for debugging but don't expose details
      console.error('Password verification error:', error.message);
      return false;
    }
  }

  /**
   * Hash a password with additional server secret (extra security)
   * @param {string} password - Plain text password
   * @returns {Object} Hashed password with server secret
   */
  static hashPasswordWithSecret(password) {
    try {
      // Validate input
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      // Generate random salt
      const salt = KeyManager.generateSalt();
      
      // Add server secret to password before hashing
      const serverSecret = CRYPTO_CONFIG.getKeyDerivationSecret();
      const passwordWithSecret = Buffer.concat([
        Buffer.from(password, 'utf8'),
        serverSecret
      ]);
      
      // Hash with PBKDF2
      const hash = crypto.pbkdf2Sync(
        passwordWithSecret,
        salt,
        CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        CRYPTO_CONFIG.PBKDF2_KEYLEN,
        CRYPTO_CONFIG.PBKDF2_DIGEST
      );

      return {
        hash: hash.toString('base64'),
        salt: salt.toString('base64'),
        iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        algorithm: CRYPTO_CONFIG.PBKDF2_DIGEST,
        keyLength: CRYPTO_CONFIG.PBKDF2_KEYLEN,
        version: 'secret-v1', // Indicates server secret usage
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Password hashing with secret failed: ${error.message}`);
    }
  }

  /**
   * Verify password against hash that used server secret
   * @param {string} password - Plain text password
   * @param {Object} storedHashObj - Stored hash object
   * @returns {boolean} Password validity
   */
  static verifyPasswordWithSecret(password, storedHashObj) {
    try {
      // Validate inputs
      if (!password || !storedHashObj || !storedHashObj.hash || !storedHashObj.salt) {
        return false;
      }

      const { hash: storedHash, salt, iterations, algorithm, keyLength } = storedHashObj;
      
      // Extract hash parameters
      const hashBuffer = Buffer.from(storedHash, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');
      
      // Add server secret to password
      const serverSecret = CRYPTO_CONFIG.getKeyDerivationSecret();
      const passwordWithSecret = Buffer.concat([
        Buffer.from(password, 'utf8'),
        serverSecret
      ]);
      
      // Hash with same parameters
      const testHash = crypto.pbkdf2Sync(
        passwordWithSecret,
        saltBuffer,
        iterations || CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        keyLength || CRYPTO_CONFIG.PBKDF2_KEYLEN,
        algorithm || CRYPTO_CONFIG.PBKDF2_DIGEST
      );

      // Use timing-safe comparison
      return crypto.timingSafeEqual(hashBuffer, testHash);
    } catch (error) {
      console.error('Password verification with secret error:', error.message);
      return false;
    }
  }

  /**
   * Validate hash object structure
   * @param {Object} hashObj - Hash object to validate
   * @returns {boolean} Validity
   */
  static validateHashObject(hashObj) {
    if (!hashObj || typeof hashObj !== 'object') {
      return false;
    }
    
    const requiredFields = ['hash', 'salt'];
    const hasAllFields = requiredFields.every(field => 
      hashObj[field] && typeof hashObj[field] === 'string'
    );
    
    return hasAllFields;
  }

  /**
   * Estimate password strength
   * @param {string} password - Password to check
   * @returns {Object} Password strength assessment
   */
  static assessPasswordStrength(password) {
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

    return {
      strength,
      score,
      checks,
      recommendations: this.getPasswordRecommendations(checks)
    };
  }

  /**
   * Get password recommendations based on failed checks
   * @param {Object} checks - Password check results
   * @returns {Array} List of recommendations
   */
  static getPasswordRecommendations(checks) {
    const recommendations = [];
    
    if (!checks.length) recommendations.push('Use at least 8 characters');
    if (!checks.lowercase) recommendations.push('Include lowercase letters');
    if (!checks.uppercase) recommendations.push('Include uppercase letters');
    if (!checks.numbers) recommendations.push('Include numbers');
    if (!checks.special) recommendations.push('Include special characters');
    if (!checks.noCommonPatterns) recommendations.push('Avoid common patterns');
    
    return recommendations;
  }
}

export default Hashing;
