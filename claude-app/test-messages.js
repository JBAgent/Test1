/**
 * Test script for the messages endpoint
 * 
 * This script tests different formats of JSON to ensure our sanitizer works
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:4000';

async function testEndpoint(endpoint, data, description) {
  console.log(`\n=== Testing ${endpoint}: ${description} ===`);
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    return { status: response.status, result };
  } catch (error) {
    console.error('Request failed:', error.message);
    return { status: 500, error: error.message };
  }
}

async function runTests() {
  // Test 1: Valid JSON with messages
  await testEndpoint(
    '/api/messages',
    JSON.stringify({
      messages: [
        { role: "user", content: "Hello Claude" }
      ]
    }),
    'Valid JSON with double quotes'
  );
  
  // Test 2: Using single quotes (THIS REPRODUCES YOUR ERROR)
  await testEndpoint(
    '/api/messages',
    // This is deliberately malformed JSON to test our sanitizer
    "{'messages': [{'role': 'user', 'content': 'Hello Claude'}]}",
    'Malformed JSON with single quotes - exact error case'
  );
  
  // Test 3: Another common issue - unquoted property names
  await testEndpoint(
    '/api/messages',
    '{"messages": [{role: "user", content: "Hello Claude"}]}',
    'Malformed JSON with unquoted property names'
  );
  
  // Test 4: Using the debug endpoint with malformed JSON
  await testEndpoint(
    '/api/debug',
    "{'test': 'value'}",
    'Malformed JSON with single quotes on debug endpoint'
  );
}

console.log('Starting message format tests...');
console.log('These tests include deliberately malformed JSON to test our sanitization');
console.log('If the sanitizer works, all tests should pass without errors');

runTests().catch(console.error);
