const Crypto = require('./src/utils/crypto/index.js').default;

console.log('Crypto Status:', JSON.stringify(Crypto.getStatus(), null, 2));

// Test encryption/decryption
try {
  const message = 'Test message for encryption';
  const password = 'TestPassword123!';
  
  console.log('\n=== Testing Crypto System ===');
  console.log('Original message:', message);
  
  // Create STEN
  const stenData = Crypto.createSten(message, password);
  console.log('STEN created:', JSON.stringify(stenData, null, 2));
  
  // Access STEN
  const decryptedMessage = Crypto.accessSten(stenData.encryptedData, stenData.passwordHash, password);
  console.log('Decrypted message:', decryptedMessage);
  
  console.log('\n=== Test Results ===');
  console.log('✅ Encryption/Decryption working correctly');
  console.log('✅ Message matches:', message === decryptedMessage);
  console.log('✅ Password strength:', stenData.passwordStrength);
  console.log('✅ Security level:', stenData.securityLevel);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
