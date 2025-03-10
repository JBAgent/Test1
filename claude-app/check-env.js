/**
 * Environment Check Utility
 * 
 * Run this script to validate your environment configuration and test MCP server connectivity
 * Usage: node check-env.js
 */

require('dotenv').config();
const fetch = require('node-fetch');

console.log('==========================================');
console.log('ENVIRONMENT CONFIGURATION CHECK');
console.log('==========================================');

// Check basic environment variables
const requiredVars = [
  { name: 'MCP_SERVER_URL', defaultValue: 'http://localhost:3000' },
  { name: 'MCP_USER_ID', defaultValue: 'default-user' },
  { name: 'PORT', defaultValue: '4000' }
];

let hasErrors = false;

// Function to check if the MCP server is running
async function checkMCPServer() {
  const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000';
  console.log(`\nAttempting to connect to MCP server at: ${mcpUrl}`);
  
  try {
    const response = await fetch(`${mcpUrl}/health`, {
      timeout: 5000 // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ MCP server is running!');
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log(`❌ MCP server returned status ${response.status}`);
      const text = await response.text();
      console.log('Response:', text);
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to connect to MCP server: ${error.message}`);
    console.log('Please make sure your MCP server is running at the specified URL');
    console.log('If your MCP server is running on a different port or URL, set the MCP_SERVER_URL environment variable');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\nPossible solution:');
      console.log('1. Navigate to the mcp-server directory: cd ../mcp-server');
      console.log('2. Start the MCP server: node server.js');
    }
    
    return false;
  }
}

// Function to test a Graph API query through the MCP server
async function testGraphAPIQuery() {
  const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000';
  const userId = process.env.MCP_USER_ID || 'default-user';
  
  console.log('\nAttempting to make a test Graph API query...');
  
  try {
    const response = await fetch(`${mcpUrl}/api/graph`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({
        endpoint: '/users',
        method: 'GET',
        queryParams: {
          '$top': 1
        }
      }),
      timeout: 10000 // 10 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Graph API query successful!');
      console.log('Response contains data:', !!data);
      
      if (data && data.value && data.value.length > 0) {
        console.log('Sample data:', JSON.stringify(data.value[0], null, 2));
      } else {
        console.log('No data returned, but request was successful');
      }
      
      return true;
    } else {
      console.log(`❌ Graph API query returned status ${response.status}`);
      const text = await response.text();
      console.log('Response:', text);
      
      // Try to parse error JSON
      try {
        const errorData = JSON.parse(text);
        if (errorData.error === 'Unauthorized' || errorData.error === 'Graph API Error') {
          console.log('\nPossible authentication issue:');
          console.log('1. Check that your Azure AD credentials are correctly set in mcp-server/.env');
          console.log('2. Make sure your application has the required permissions in Azure AD');
          console.log('3. Verify that the user ID you\'re using has appropriate permissions');
        }
      } catch (e) {
        // Not JSON, ignore
      }
      
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to make Graph API query: ${error.message}`);
    return false;
  }
}

// Check for required environment variables
console.log('Checking required environment variables:');
for (const variable of requiredVars) {
  const value = process.env[variable.name] || variable.defaultValue;
  if (!value) {
    console.log(`❌ ${variable.name} is not set`);
    hasErrors = true;
  } else {
    console.log(`✅ ${variable.name}: ${value}`);
  }
}

// Additional check for API_KEY (optional but recommended)
if (!process.env.API_KEY) {
  console.log('⚠️ API_KEY is not set - this is optional but recommended for production');
} else {
  console.log('✅ API_KEY is set');
}

// Run async checks
async function runAsyncChecks() {
  // Check MCP server connectivity
  const mcpServerRunning = await checkMCPServer();
  
  // Only test Graph API if MCP server is running
  if (mcpServerRunning) {
    await testGraphAPIQuery();
  }
  
  console.log('\n==========================================');
  if (hasErrors) {
    console.log('❌ Configuration check completed with errors');
    console.log('Please fix the issues above and try again');
  } else {
    console.log('✅ Basic configuration check passed');
    console.log('If you\'re still experiencing issues with Graph API data,');
    console.log('check your Azure AD application permissions and credentials');
  }
  console.log('==========================================');
}

runAsyncChecks().catch(console.error);
