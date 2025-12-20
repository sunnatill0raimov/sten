import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import { SECURITY_CONFIG } from '../src/config/security.config.js';

// Test database setup
const testDb = new MongoMemoryServer();
testDb.start();

// Test data
const testUsers = [
  {
    _id: new mongoose.Types.ObjectId(),
    username: 'testuser1',
    email: 'test1@example.com',
    password: crypto.pbkdf2Sync('sha256', 'salt123', 'testpassword1').toString('hex'),
    salt: 'salt123'
  },
  {
    _id: new mongoose.Types.ObjectId(),
    username: 'testuser2',
    email: 'test2@example.com',
    password: crypto.pbkdf2Sync('sha256', 'salt456', 'testpassword2').toString('hex'),
    salt: 'salt456'
  }
];

describe('STEN Security Tests', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Setup test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    
    // Insert test users
    await mongoose.connection.db.collection('users').insertMany(testUsers);
    
    // Import app after database is ready
    app = (await import('../app.js')).default;
    
    server = app.listen(0); // Use port 0 for testing
  });

  afterAll(async () => {
    await mongoose.connection.close();
    if (server) server.close();
    await testDb.stop();
  });

  describe('Password Security', () => {
    test('should reject weak passwords', async () => {
      const response = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'test message',
          password: '123', // Too weak
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password is too weak');
    });

    test('should reject passwords without complexity', async () => {
      const response = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'test message',
          password: 'password123', // Only letters
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must contain at least');
    });

    test('should reject passwords without numbers', async () => {
      const response = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'test message',
          password: 'Password!@#', // No numbers
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must contain at least');
    });

    test('should reject passwords without symbols', async () => {
      const response = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'test message',
          password: 'Password123', // No symbols
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('must contain at least');
    });

    test('should accept strong passwords', async () => {
      const response = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'test message',
          password: 'SecureP@ssw0rd123!', // Strong password
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.stenId).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should block excessive rapid requests', async () => {
      
      // Create a STEN for testing
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'rate limit test',
          password: 'RateLimitTest2024!@#',
          maxWinners: 5,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      const { stenId } = createResponse.body;
      
      // Make rapid requests - should exceed rate limit
      const promises = Array(10).fill(() => 
        request(app)
          .post(`/api/sten/${stenId}/view`)
          .send({
            password: 'RateLimitTest2024!@#',
            userId: 'testuser1'
          })
      );
      
      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 200).length;
      
      expect(successes).toBeLessThan(6); // Should be rate limited
    });

    test('should allow legitimate spaced requests', async () => {
      
      // Create a STEN for testing
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'legitimate rate test',
          password: 'LegitimateTest2024!@#',
          maxWinners: 5,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      const { stenId } = createResponse.body;
      
      // Make requests with delays - should not exceed rate limit
      const makeRequest = (delay) => 
        new Promise(resolve => 
          setTimeout(() => resolve(
            request(app)
              .post(`/api/sten/${stenId}/view`)
              .send({
                password: 'LegitimateTest2024!@#',
                userId: 'testuser2'
              })
          ), delay)
        );
      
      const results = await Promise.all([
        makeRequest(100),  // 100ms delay
        makeRequest(200),  // 200ms delay
        makeRequest(300),  // 300ms delay
        makeRequest(400),  // 400ms delay
      ]);
      
      const successes = results.filter(r => r.status === 200).length;
      
      expect(successes).toBe(4); // All should succeed
    });
  });

  describe('Race Condition Prevention', () => {
    test('should prevent duplicate winners', async () => {
      const password = 'DuplicateTest2024!@#';
      
      // Create a STEN with maxWinners: 2
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'duplicate winner test',
          password: password,
          maxWinners: 2,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      const { stenId } = createResponse.body;
      
      // First winner attempt
      const firstResponse = await request(app)
        .post(`/api/sten/${stenId}/view`)
        .send({
          password: password,
          userId: 'testuser1'
        });
      
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.solved).toBe(false);
      expect(firstResponse.body.currentWinners).toBe(1);
      
      // Second winner attempt with different user
      const secondResponse = await request(app)
        .post(`/api/sten/${stenId}/view`)
        .send({
          password: password,
          userId: 'testuser2'
        });
      
      expect(secondResponse.status).toBe(403);
      expect(secondResponse.body.error).toContain('Maximum winners reached');
      
      // Verify winner count is consistent
      const checkResponse = await request(app)
        .get(`/api/sten/${stenId}`)
        .expect(200);
      
      expect(checkResponse.body.currentWinners).toBe(1);
    });

    test('should handle concurrent attempts safely', async () => {
      const password = 'ConcurrentTest2024!@#';
      
      // Create a STEN
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'concurrent test',
          password: password,
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      const { stenId } = createResponse.body;
      
      // Make concurrent requests
      const concurrentRequests = Array(5).fill(() => 
        request(app)
          .post(`/api/sten/${stenId}/view`)
          .send({
            password: password,
            userId: `testuser${Math.floor(Math.random() * 1000)}`
          })
      );
      
      const results = await Promise.allSettled(concurrentRequests);
      const successes = results.filter(r => r.status === 200).length;
      
      // Only one should succeed due to atomic operations
      expect(successes).toBe(1);
      
      // Verify winner is properly set
      const checkResponse = await request(app)
        .get(`/api/sten/${stenId}`)
        .expect(200);
      
      expect(checkResponse.body.currentWinners).toBe(1);
      expect(checkResponse.body.solved).toBe(true);
    });
  });

  describe('Expiration Security', () => {
    test('should reject expired STEN access', async () => {
      
      // Create an already expired STEN
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'expired test',
          password: 'ExpiredTest2024!@#',
          maxWinners: 1,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        });
      
      const { stenId } = createResponse.body;
      
      // Try to access expired STEN
      const response = await request(app)
        .post(`/api/sten/${stenId}/view`)
        .send({
          password: 'ExpiredTest2024!@#',
          userId: 'testuser1'
        });
      
      expect(response.status).toBe(410);
      expect(response.body.error).toContain('expired');
    });

    test('should allow access to non-expired STEN', async () => {
      
      // Create a STEN that expires in the future
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'not expired test',
          password: 'NotExpiredTest2024!@#',
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        });
      
      const { stenId } = createResponse.body;
      
      // Should be able to access
      const response = await request(app)
        .post(`/api/sten/${stenId}/view`)
        .send({
          password: 'NotExpiredTest2024!@#',
          userId: 'testuser1'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid STEN ID', async () => {
      const response = await request(app)
        .post('/api/sten/invalid-id/view')
        .send({
          password: 'Test2024!@#',
          userId: 'testuser1'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid STEN ID');
    });

    test('should reject malformed password', async () => {
      
      // Create a STEN first
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'input validation test',
          password: 'InputValidTest2024!@#',
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      const { stenId } = createResponse.body;
      
      // Send password that's too long
      const longPassword = 'A'.repeat(200); // 200 characters
      const response = await request(app)
        .post(`/api/sten/${stenId}/view`)
        .send({
          password: longPassword,
          userId: 'testuser1'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Password must be');
    });

    test('should reject password with only spaces', async () => {
      
      // Create a STEN first
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'spaces only test',
          password: '        ', // Only spaces
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      const { stenId } = createResponse.body;
      
      const response = await request(app)
        .post(`/api/sten/${stenId}/view`)
        .send({
          password: '        ',
          userId: 'testuser1'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('cannot be only whitespace');
    });
  });

  describe('Error Handling', () => {
    test('should not expose sensitive data in errors', async () => {
      
      // Create a STEN first
      const createResponse = await request(app)
        .post('/api/sten/create')
        .send({
          message: 'error handling test',
          password: 'ErrorHandleTest2024!@#',
          maxWinners: 1,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
      
      const { stenId } = createResponse.body;
      
      // Send wrong password to trigger error
      const response = await request(app)
        .post(`/api/sten/${stenId}/view`)
        .send({
          password: 'wrongpassword',
          userId: 'testuser1'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).not.toHaveProperty('encryptedMessage');
      expect(response.body).not.toHaveProperty('salt');
      expect(response.body).not.toHaveProperty('solvedBy');
      expect(response.body).not.toHaveProperty('securityLevel');
    });

    test('should provide appropriate error codes', async () => {
      const testCases = [
        { password: '', expected: 401, description: 'missing password' },
        { password: '123', expected: 400, description: 'weak password' },
        { userId: 'invalid-id', expected: 400, description: 'invalid user ID' },
        { stenId: 'non-existent', password: 'test123', expected: 404, description: 'non-existent STEN' }
      ];
      
      for (const testCase of testCases) {
        const response = await request(app)
          .post(`/api/sten/${testCase.stenId || 'test-error-codes'}/view`)
          .send({
            password: testCase.password,
            userId: testCase.userId || 'testuser1'
          });
        
        expect(response.status).toBe(testCase.expected);
        expect(response.body).toHaveProperty('error');
      }
    });
  });
});
