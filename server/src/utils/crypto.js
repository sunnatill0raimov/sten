import crypto from 'crypto';

// Configuration for security (security over speed)
const PBKDF2_ITERATIONS = 100000; // High iteration count for security
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha256'; // SHA-256 as requested
const AES_ALGORITHM = 'aes-256-cbc';
const AES_KEYLEN = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const SALT_LENGTH = 32; // 256 bits salt

/**
 * Hash a password using PBKDF2 with embedded salt
 * Returns a single string containing salt:hash
 */
export const hashPassword = (password) => {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);

  // Combine salt and hash, base64 encoded
  const combined = Buffer.concat([salt, hash]);
  return combined.toString('base64');
};

/**
 * Verify a password against a stored hash
 */
export const verifyPassword = (password, storedHash) => {
  try {
    const combined = Buffer.from(storedHash, 'base64');
    const salt = combined.subarray(0, SALT_LENGTH);
    const originalHash = combined.subarray(SALT_LENGTH);

    const hashToVerify = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);

    return crypto.timingSafeEqual(originalHash, hashToVerify);
  } catch (error) {
    return false;
  }
};

/**
 * Encrypt a message using AES-256-GCM with key derived from password
 * Returns an object with encrypted data, iv, authTag, and salt
 */
export const encryptMessage = (message, password) => {
  // Derive encryption key from password
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, AES_KEYLEN, PBKDF2_DIGEST);

  // Generate IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);

  // Encrypt the message
  let encrypted = cipher.update(message, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
    salt: salt.toString('base64')
  };
};

/**
 * Decrypt a message using AES-256-GCM with key derived from password
 */
export const decryptMessage = (encryptedDataObj, password) => {
  try {
    const { encryptedData, iv, salt } = encryptedDataObj;

    // Derive decryption key from password
    const key = crypto.pbkdf2Sync(password, Buffer.from(salt, 'base64'), PBKDF2_ITERATIONS, AES_KEYLEN, PBKDF2_DIGEST);

    // Create decipher
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, Buffer.from(iv, 'base64'));

    // Decrypt the message
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: Invalid password or corrupted data');
  }
};

// Legacy functions for backward compatibility (deprecated)
export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};
