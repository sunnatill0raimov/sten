/**
 * Main Crypto Module
 * Centralized export for all crypto utilities
 */

import CRYPTO_CONFIG from '../../config/crypto.config.js';
import KeyManager from './keyManager.js';
import Encryption from './encryption.js';
import Hashing from './hashing.js';
import crypto from 'crypto';

/**
 * High-level crypto operations for STEN application
 */
class Crypto {
  /**
   * Assess password strength
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

  /**
   * Access a STEN with security validation
   * @param {string} encryptedData - Encrypted message data
   * @param {string} passwordHash - Stored password hash
   * @param {string} password - User provided password
   * @returns {string} Decrypted message if access is valid
   */
  static accessSten(encryptedData, passwordHash, password) {
    try {
      // Parse stored data
      let encryptedDataObj, passwordHashObj;
      
      try {
        encryptedDataObj = JSON.parse(encryptedData);
        passwordHashObj = JSON.parse(passwordHash);
      } catch (parseError) {
        throw new Error('Invalid data format');
      }

      // Validate data structures
      if (!Encryption.validateEncryptedData(encryptedDataObj)) {
        throw new Error('Invalid encrypted data');
      }

      if (!Hashing.validateHashObject(passwordHashObj)) {
        throw new Error('Invalid password hash');
      }

      // Verify password
      const isPasswordValid = Hashing.verifyPasswordWithSecret(password, passwordHashObj);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Decrypt message
      const decryptedMessage = Encryption.decryptMessage(encryptedDataObj);

      return decryptedMessage;
    } catch (error) {
      throw new Error(`STEN access failed: ${error.message}`);
    }
  }

  /**
   * Hash password with PBKDF2 only (no server secret)
   * @param {string} password - User password
   * @returns {Object} Hashed password with salt and metadata
   */
  static hashPasswordOnly(password) {
    try {
      // Validate input
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      // Generate salt
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
   * Verify password against stored hash (no server secret)
   * @param {string} password - Plain text password
   * @param {Object} storedHashObj - Stored hash object
   * @returns {boolean} Password validity
   */
  static verifyPasswordOnly(password, storedHashObj) {
    try {
      // Validate inputs
      if (!password || !storedHashObj || !storedHashObj.hash || !storedHashObj.salt) {
        return false;
      }

      const { hash: storedHash, salt, iterations, algorithm, keyLength } = storedHashObj;
      
      // Extract hash parameters
      const hashBuffer = Buffer.from(storedHash, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');
      
      // Hash provided password with same parameters
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
   * Create a new STEN with security
   * @param {string} message - Plain text message
   * @param {string} password - User password
   * @returns {Object} Encrypted data and password hash
   */
  static createSten(message, password) {
    try {
      // Validate inputs
      if (!message || !password) {
        throw new Error('Message and password are required');
      }

      // Assess password strength
      const passwordStrength = Hashing.assessPasswordStrength(password);
      if (passwordStrength.strength === 'weak') {
        console.warn('Weak password detected:', passwordStrength.recommendations);
      }

      // Encrypt message with server key (primary security)
      const encryptedMessage = Encryption.encryptMessage(message);
      
      // Hash password with server secret (additional security)
      const passwordHash = Hashing.hashPasswordWithSecret(password);

      return {
        encryptedData: JSON.stringify(encryptedMessage),
        passwordHash: JSON.stringify(passwordHash),
        passwordStrength: passwordStrength.strength,
        securityLevel: 'high', // Using both encryption and server secret
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`STEN creation failed: ${error.message}`);
    }
  }

  /**
   * Access a STEN with security validation
   * @param {string} encryptedData - Encrypted message data
   * @param {string} passwordHash - Stored password hash
   * @param {string} password - User provided password
   * @returns {string} Decrypted message if access is valid
   */
  static accessSten(encryptedData, passwordHash, password) {
    try {
      // Parse stored data
      let encryptedDataObj, passwordHashObj;
      
      try {
        encryptedDataObj = JSON.parse(encryptedData);
        passwordHashObj = JSON.parse(passwordHash);
      } catch (parseError) {
        throw new Error('Invalid data format');
      }

      // Validate data structures
      if (!Encryption.validateEncryptedData(encryptedDataObj)) {
        throw new Error('Invalid encrypted data');
      }

      if (!Hashing.validateHashObject(passwordHashObj)) {
        throw new Error('Invalid password hash');
      }

      // Verify password
      const isPasswordValid = Hashing.verifyPasswordWithSecret(password, passwordHashObj);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Decrypt message
      const decryptedMessage = Encryption.decryptMessage(encryptedDataObj);

      return decryptedMessage;
    } catch (error) {
      throw new Error(`STEN access failed: ${error.message}`);
    }
  }

  /**
   * Hash password with PBKDF2 only (no server secret)
   * @param {string} password - User password
   * @returns {Object} Hashed password with salt and metadata
   */
  static hashPasswordOnly(password) {
    try {
      // Validate input
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      // Generate salt
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
   * Verify password against stored hash (no server secret)
   * @param {string} password - Plain text password
   * @param {Object} storedHashObj - Stored hash object
   * @returns {boolean} Password validity
   */
  static verifyPasswordOnly(password, storedHashObj) {
    try {
      // Validate inputs
      if (!password || !storedHashObj || !storedHashObj.hash || !storedHashObj.salt) {
        return false;
      }

      const { hash: storedHash, salt, iterations, algorithm, keyLength } = storedHashObj;
      
      // Extract hash parameters
      const hashBuffer = Buffer.from(storedHash, 'base64');
      const saltBuffer = Buffer.from(salt, 'base64');
      
      // Hash provided password with same parameters
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
   * Create a new STEN with basic security (hashing only)
   * @param {string} message - Plain text message
   * @param {string} password - User password
   * @returns {Object} Encrypted data and password hash
   */
  static createStenLowSecurity(message, password) {
    try {
      // Validate inputs
      if (!message || !password) {
        throw new Error('Message and password are required');
      }

      // Assess password strength
      const passwordStrength = Hashing.assessPasswordStrength(password);
      if (passwordStrength.strength === 'weak') {
        console.warn('Weak password detected:', passwordStrength.recommendations);
      }

      // Encrypt message with server key (primary security)
      const encryptedMessage = Encryption.encryptMessage(message);
      
      // Hash password with PBKDF2 only (basic security)
      const passwordHash = this.hashPasswordOnly(password);

      return {
        encryptedData: JSON.stringify(encryptedMessage),
        passwordHash: JSON.stringify(passwordHash),
        passwordStrength: passwordStrength.strength,
        securityLevel: 'low', // Basic security only
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`STEN creation failed: ${error.message}`);
    }
  }

  /**
   * Access a STEN with basic security (hashing only)
   * @param {string} encryptedData - Encrypted message data
   * @param {string} passwordHash - Stored password hash
   * @param {string} password - User provided password
   * @returns {string} Decrypted message if access is valid
   */
  static accessStenLowSecurity(encryptedData, passwordHash, password) {
    try {
      // Parse stored data
      let encryptedDataObj, passwordHashObj;
      
      try {
        encryptedDataObj = JSON.parse(encryptedData);
        passwordHashObj = JSON.parse(passwordHash);
      } catch (parseError) {
        throw new Error('Invalid data format');
      }

      // Validate data structures
      if (!Encryption.validateEncryptedData(encryptedDataObj)) {
        throw new Error('Invalid encrypted data');
      }

      if (!Hashing.validateHashObject(passwordHashObj)) {
        throw new Error('Invalid password hash');
      }

      // Verify password
      const isPasswordValid = this.verifyPasswordOnly(password, passwordHashObj);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Decrypt message
      const decryptedMessage = Encryption.decryptMessage(encryptedDataObj);

      return decryptedMessage;
    } catch (error) {
      throw new Error(`STEN access failed: ${error.message}`);
    }
  }

  /**
   * Decrypt message with user-derived key
   * @param {Object} encryptedDataObj - Encrypted data object
   * @param {string} password - User password
   * @returns {string} Decrypted plain text message
   */
  static decryptMessageWithPassword(encryptedDataObj, password) {
    try {
      const { encryptedData, iv, salt, algorithm } = encryptedDataObj;
      
      // Validate input
      if (!encryptedData || !iv || !salt) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Derive key from password and salt using the same method as legacy
      const key = crypto.pbkdf2Sync(
        password,
        Buffer.from(salt, 'base64'),
        CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        CRYPTO_CONFIG.KEY_LENGTH,
        CRYPTO_CONFIG.PBKDF2_DIGEST
      );
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        algorithm || CRYPTO_CONFIG.ALGORITHM,
        key,
        Buffer.from(iv, 'base64')
      );
      
      // Decrypt the message
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Password decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Hex-encoded token
   */
  static generateToken(length = 32) {
    return KeyManager.generateSecureKey(length);
  }

  /**
   * Validate STEN data before saving
   * @param {Object} stenData - STEN data to validate
   * @returns {boolean} Validity
   */
  static validateStenData(stenData) {
    if (!stenData || typeof stenData !== 'object') {
      return false;
    }

    const requiredFields = ['encryptedData', 'passwordHash'];
    const hasAllFields = requiredFields.every(field => 
      stenData[field] && typeof stenData[field] === 'string'
    );

    if (!hasAllFields) {
      return false;
    }

    try {
      // Try to parse encrypted data
      const encryptedDataObj = JSON.parse(stenData.encryptedData);
      const passwordHashObj = JSON.parse(stenData.passwordHash);

      return Encryption.validateEncryptedData(encryptedDataObj) && 
             Hashing.validateHashObject(passwordHashObj);
    } catch {
      return false;
    }
  }
}

// Export individual utilities for advanced usage
export {
  CRYPTO_CONFIG,
  KeyManager,
  Encryption,
  Hashing
};

// Export specific methods for convenience
export const encryptMessage = Encryption.encryptMessage.bind(Encryption);
export const hashPasswordOnly = Crypto.hashPasswordOnly.bind(Crypto);

// Export main class for common usage
export default Crypto;
