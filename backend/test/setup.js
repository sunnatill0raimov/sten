const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Test database setup
let testDb;

const setupTestDatabase = async () => {
  if (!testDb) {
    testDb = new MongoMemoryServer();
    await testDb.start();
  }
  
  // Connect to test database
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
  
  // Clear existing data
  await mongoose.connection.db.dropDatabase();
  
  return testDb;
};

const cleanupTestDatabase = async () => {
  await mongoose.connection.close();
  if (testDb) {
    await testDb.stop();
  }
};

const getTestDb = () => testDb;

module.exports = {
  setupTestDatabase,
  cleanupTestDatabase,
  getTestDb
};
