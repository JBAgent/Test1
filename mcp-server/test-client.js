/**
 * Test Client for the MCP Server
 * 
 * This script provides examples of how to properly call the MCP server.
 * Run it with: node test-client.js
 */

const fetch = require('node-fetch');

// Configuration
const MCP_SERVER_URL = 'http://localhost:3000';
const USER_ID = 'test-user';

// Example requests to test
const examples = [
  {
    name: 'Health Check',
    path: '/health',
    method: 'GET'
  },
  {
    name: 'Basic Users Query',
    request: {
      endpoint: '/users',
      method: 'GET',
      queryParams: {
        '$top': 5
      },
      allData: false
      // No consistencyLevel parameter
    }
  },
  {
    name: 'Users Query with Select Fields',
    request: {
      endpoint: '/users',
      method: 'GET',
      queryParams: {
        '$top': 5,
        '$select': 'id,displayName,mail'
      },
      allData: false
      // No consistencyLevel parameter
    }
  },
  {
    name: 'SharePoint Sites Query',
    request: {
      endpoint: '/sites',
      method: 'GET',
      queryParams: {
        '$top': 5
      },
      allData: false
    }
  },
  {
    name: 'OneDrive API Query (if you have permission)',
    request: {
      endpoint: '/me/drive',
      method: 'GET'
    }
  }
];

// Function to call the MCP server
async function callMCPServer(example) {
  try {
    console.log(`\n=== Testing: ${example.name} ===`);
    
    let url, options;
    
    if (example.path) {
      // Direct endpoint test (like health check)
      url = `${MCP_SERVER_URL}${example.path}`;
      options = {
        method: example.method || 'GET',
        headers: {
          'X-User-ID': USER_ID
        }
      };
    } else {
      // Graph API request
      url = `${MCP_SERVER_URL}/api/graph`;
      options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': USER_ID
        },
        body: JSON.stringify(example.request)
      };
      
      // Show exactly what we're sending
      console.log('Request URL:', url);
      console.log('Request body:', options.body);
    }
    
    // Make the request
    const response = await fetch(url, options);
    const data = await response.json();
    
    // Log results
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500) + (JSON.stringify(data, null, 2).length > 500 ? '...' : ''));
    
    return { success: response.ok, data };
  } catch (error) {
    console.error('Error making request:', error.message);
    return { success: false, error: error.message };
  }
}

// Run all example tests
async function runTests() {
  console.log('Starting MCP Server test client...');
  console.log('Note: If you see 401 errors, make sure you have set up your Azure AD credentials');
  console.log('Note: Some examples may fail if you do not have appropriate permissions');
  console.log('Note: ConsistencyLevel parameter has been removed from all examples due to compatibility issues');
  
  // Test health endpoint first
  const healthExample = examples.find(ex => ex.path === '/health');
  if (healthExample) {
    const health = await callMCPServer(healthExample);
    if (!health.success) {
      console.error('Health check failed. Is the MCP server running?');
      return;
    }
  }
  
  // Run the remaining tests
  for (const example of examples) {
    if (example.path !== '/health') {
      await callMCPServer(example);
    }
  }
  
  console.log('\nAll tests completed.');
}

// Run the tests
runTests().catch(console.error);
