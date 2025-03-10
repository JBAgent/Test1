/**
 * Test script for MCP server integration
 * 
 * This script directly tests the MCP integration to help diagnose issues
 * with the Graph API connections.
 */

require('dotenv').config();
const ClaudeMCPIntegration = require('./claude-mcp-integration');

// Create the integration instance with configs from .env
const integration = new ClaudeMCPIntegration({
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY,
  userId: process.env.MCP_USER_ID || 'default-user'
});

// Get the functions
const graphFunctions = integration.createClaudeFunctions();

// Test health check of MCP server
async function testMCPHealth() {
  try {
    console.log('\n=== Testing MCP Server Health ===');
    console.log(`Connecting to MCP server at: ${process.env.MCP_SERVER_URL || 'http://localhost:3000'}`);
    
    const response = await fetch(`${process.env.MCP_SERVER_URL || 'http://localhost:3000'}/health`);
    const data = await response.json();
    
    console.log('MCP Server Health Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return response.ok;
  } catch (error) {
    console.error('Error connecting to MCP server:', error.message);
    console.error('Please check that your MCP server is running and accessible.');
    console.error('The MCP_SERVER_URL in your .env file is:', process.env.MCP_SERVER_URL || 'http://localhost:3000');
    return false;
  }
}

// Test user query
async function testUserQuery() {
  try {
    console.log('\n=== Testing User Query ===');
    console.log('Requesting top 5 users from Graph API...');
    
    const result = await graphFunctions.getUsers({
      queryParams: {
        '$top': 5
      }
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.value && result.value.length > 0) {
      console.log(`Successfully retrieved ${result.value.length} users`);
    } else {
      console.log('No users returned. This could be due to:');
      console.log('1. No users exist in the tenant');
      console.log('2. Permissions issue with the Graph API');
      console.log('3. Configuration issue with Azure credentials');
    }
  } catch (error) {
    console.error('User query failed:', error.message);
  }
}

// Test direct Graph query
async function testDirectGraphQuery() {
  try {
    console.log('\n=== Testing Direct Graph Query ===');
    console.log('Making a direct request to /users endpoint...');
    
    const result = await graphFunctions.graphQuery({
      endpoint: '/users',
      method: 'GET',
      queryParams: {
        '$top': 5,
        '$select': 'id,displayName,mail'
      },
      version: 'beta'
    });
    
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Direct graph query failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting MCP integration tests...');
  console.log('==============================');
  console.log('This script will test the connection between:');
  console.log('- Claude App (this application)');
  console.log('- MCP Server (the middleware)');
  console.log('- Microsoft Graph API');
  console.log('==============================\n');
  
  // Check if .env file has been configured
  if (!process.env.MCP_SERVER_URL) {
    console.warn('WARNING: MCP_SERVER_URL not found in .env file.');
    console.warn('Please make sure you have created an .env file based on .env.example');
    console.warn('Using default: http://localhost:3000\n');
  }
  
  // First check MCP server health
  const healthOk = await testMCPHealth();
  
  if (!healthOk) {
    console.error('\nMCP server health check failed. Stopping tests.');
    return;
  }
  
  // Test user query
  await testUserQuery();
  
  // Test direct graph query
  await testDirectGraphQuery();
  
  console.log('\n==============================');
  console.log('Tests completed.');
  console.log('If you see any errors, please check:');
  console.log('1. MCP server is running correctly');
  console.log('2. Azure AD credentials are properly configured in the MCP server');
  console.log('3. The necessary Graph API permissions are granted to your application');
  console.log('==============================');
}

// Run the tests
runAllTests().catch(console.error);
