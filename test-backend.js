#!/usr/bin/env node

// Simple test script to verify backend connection
const fetch = require('node-fetch');

async function testBackend() {
  console.log('🧪 Testing backend connection...\n');

  const API_BASE_URL = 'http://localhost:3003';

  try {
    // Test 1: Check if backend is running
    console.log('1. Testing basic connection...');
    const response = await fetch(API_BASE_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Backend is running!');
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    console.log('');

    // Test 2: Test STEN creation endpoint
    console.log('2. Testing STEN creation endpoint...');
    const createResponse = await fetch(`${API_BASE_URL}/api/sten/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test STEN message from script',
        isPasswordProtected: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        maxWinners: 1,
        oneTime: true
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(`STEN creation failed: ${JSON.stringify(error)}`);
    }

    const stenData = await createResponse.json();
    console.log('✅ STEN creation successful!');
    console.log('📄 Response:', JSON.stringify(stenData, null, 2));
    console.log('');

    // Test 3: Test getting all STENs
    console.log('3. Testing GET all STENs endpoint...');
    const getAllResponse = await fetch(`${API_BASE_URL}/api/sten`);
    
    if (!getAllResponse.ok) {
      throw new Error(`GET all STENs failed: ${getAllResponse.status}`);
    }

    const allStens = await getAllResponse.json();
    console.log('✅ GET all STENs successful!');
    console.log('📄 Response:', JSON.stringify(allStens, null, 2));
    console.log('');

    console.log('🎉 All tests passed! Your backend is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure the backend server is running: cd sten/server && npm start');
    console.log('2. Check if port 3003 is available');
    console.log('3. Verify MongoDB connection in .env file');
    console.log('4. Check if all dependencies are installed: cd sten/server && npm install');
    process.exit(1);
  }
}

// Run the test
testBackend();
