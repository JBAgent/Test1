/**
 * Test client for Claude MCP integration
 * 
 * This script helps test API endpoints and validate JSON formatting
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:4000'; // Adjust if your server runs on a different port

// Example request bodies
const examples = {
  // Valid example for graph-query
  validGraphQuery: {
    endpoint: '/users',
    method: 'GET',
    queryParams: {
      $select: 'displayName,mail',
      $top: 10
    }
  },
  
  // Invalid - using single quotes (this would cause the error you're seeing)
  invalidSingleQuotes: '{\'messages\': [{\'role\': \'user\', \'content\': \'Hello\'}]}',
  
  // Invalid - not using quotes for property names
  invalidPropertyNames: {
    endpoint: "/users",
    method: "GET",
    queryParams: {
      $select: "displayName,mail",
      $top: 10
    }
  },
  
  // Valid message format
  validMessages: {
    messages: [
      {
        role: "user",
        content: "Hello, how are you?"
      }
    ],
    max_tokens: 100,
    temperature: 0.7
  }
};

// Utility to make requests
async function makeRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      // If the body is a string, use it directly (for testing invalid JSON)
      // Otherwise, stringify the object properly
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    console.log(`\nMaking ${method} request to ${endpoint}`);
    if (body) {
      console.log('Request body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    return { status: response.status, data };
  } catch (error) {
    console.error('Request failed:', error.message);
    return { status: 500, error: error.message };
  }
}

// Test suite
async function runTests() {
  console.log('=== Claude MCP Integration API Test Client ===\n');
  
  // 1. Test health endpoint
  await makeRequest('/health');
  
  // 2. Test debug endpoint with valid JSON
  await makeRequest('/api/debug', 'POST', examples.validGraphQuery);
  
  // 3. Test debug endpoint with the exact invalid JSON that caused your error
  console.log('\n=== Testing with INVALID JSON (single quotes) ===');
  console.log('This should reproduce your error, but now with a clear error message:');
  await makeRequest('/api/debug', 'POST', examples.invalidSingleQuotes);
  
  // 4. Test graph-query endpoint
  await makeRequest('/api/graph-query', 'POST', examples.validGraphQuery);
  
  console.log('\n=== All tests completed ===');
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
});
