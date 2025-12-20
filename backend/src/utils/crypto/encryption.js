import crypto from 'crypto';
import CRYPTO_CONFIG from '../../config/crypto.config.js';
import KeyManager from './keyManager.js';

/**
 * Encryption Utility
 * Handles message encryption and decryption using server-side keys
 */
class Encryption {
  /**
   * Encrypt a message using server-side encryption key
   * @param {string} message - Plain text message to encrypt
   * @returns {Object} Encrypted data with IV and metadata
   */
  static encryptMessage(message) {
    try {
      // Validate input
      if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
      }

      // Get server encryption key
      const key = KeyManager.getServerEncryptionKey();
      
      // Generate random IV
      const iv = KeyManager.generateIV();
      
      // Create cipher
      const cipher = crypto.createCipheriv(CRYPTO_CONFIG.ALGORITHM, key, iv);
      
      // Encrypt the message
      let encrypted = cipher.update(message, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        algorithm: CRYPTO_CONFIG.ALGORITHM,
        keyVersion: 'v1', // For future key rotation support
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a message using server-side encryption key
   * @param {Object} encryptedDataObj - Encrypted data object
   * @returns {string} Decrypted plain text message
   */
  static decryptMessage(encryptedDataObj) {
    try {
      const { encryptedData, iv, algorithm, keyVersion } = encryptedDataObj;
      
      // Validate input
      if (!encryptedData || !iv) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Get server encryption key
      const key = KeyManager.getServerEncryptionKey();
      
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
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt message with user-derived key (alternative method)
   * This provides additional security layer when user password is required
   * @param {string} message - Plain text message
   * @param {string} password - User password
   * @returns {Object} Encrypted data with salt and IV
   */
  static encryptMessageWithPassword(message, password) {
    try {
      // Generate salt for key derivation
      const salt = KeyManager.generateSalt();
      const iv = KeyManager.generateIV();
      
      // Derive key from password and salt
      const key = KeyManager.deriveEncryptionKey(password, salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(CRYPTO_CONFIG.ALGORITHM, key, iv);
      
      // Encrypt the message
      let encrypted = cipher.update(message, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        algorithm: CRYPTO_CONFIG.ALGORITHM,
        keyVersion: 'password-v1',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Password encryption failed: ${error.message}`);
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
      
      // Derive key from password and salt
      const key = KeyManager.deriveEncryptionKey(password, Buffer.from(salt, 'base64'));
      
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
   * Validate encrypted data structure
   * @param {Object} encryptedDataObj - Encrypted data object
   * @returns {boolean} Validity
   */
  static validateEncryptedData(encryptedDataObj) {
    if (!encryptedDataObj || typeof encryptedDataObj !== 'object') {
      return false;
    }
    
    const requiredFields = ['encryptedData', 'iv'];
    const hasAllFields = requiredFields.every(field => 
      encryptedDataObj[field] && typeof encryptedDataObj[field] === 'string'
    );
    
    return hasAllFields;
  }
}

export default Encryption;
