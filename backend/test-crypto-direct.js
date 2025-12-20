import Crypto from './src/utils/crypto/index.js';

try {
  console.log('Testing crypto utilities...');
  
  // Test password hashing
  console.log('Testing hashPasswordOnly...');
  const hashedPassword = Crypto.hashPasswordOnly('TestPassword123');
  console.log('Password hash result:', hashedPassword);
  
  // Test message encryption
  console.log('Testing encryptMessage...');
  const encrypted = Crypto.encryptMessage('Test message');
  console.log('Encryption result:', encrypted);
  
  console.log('SUCCESS: All crypto utilities working');
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
}
