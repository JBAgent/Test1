/**
 * Test script to verify Claude app functionality without MCP server
 * 
 * This script tests the Claude app's ability to handle messages and return fallback data
 * when the MCP server isn't available
 * 
 * Usage: node test-without-mcp.js
 */

const fetch = require('node-fetch');

// Configuration
const CLAUDE_APP_URL = process.env.CLAUDE_APP_URL || 'http://localhost:4000';

// Test message that contains a user query
const testMessage = {
  messages: [
    {
      role: "user",
      content: "Who are the top 5 users in the organization?"
    }
  ]
};

async function runTest() {
  console.log('==========================================');
  console.log('CLAUDE APP TEST - WITHOUT MCP SERVER');
  console.log('==========================================');
  console.log(`Testing Claude app at: ${CLAUDE_APP_URL}`);
  
  // Step 1: Check if the Claude app is running (health check)
  console.log('\n1. Testing health endpoint...');
  try {
    const healthResponse = await fetch(`${CLAUDE_APP_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Claude app is running!');
      console.log('Health response:', JSON.stringify(healthData, null, 2));
    } else {
      console.log(`❌ Health check failed with status ${healthResponse.status}`);
      console.log('Make sure your Claude app is running');
      return;
    }
  } catch (error) {
    console.log(`❌ Failed to connect to Claude app: ${error.message}`);
    console.log('Make sure your Claude app is running at the specified URL');
    return;
  }
  
  // Step 2: Send a test message to the messages endpoint
  console.log('\n2. Testing /api/messages endpoint with user query...');
  try {
    const messageResponse = await fetch(`${CLAUDE_APP_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    const messageData = await messageResponse.json();
    
    if (messageResponse.ok) {
      console.log('✅ Successfully processed message!');
      
      // Check if we got any graph data
      if (messageData.graphData) {
        console.log('✅ Graph data returned (possibly fallback data)');
        
        // Print the first few items if available
        if (messageData.graphData.value && messageData.graphData.value.length > 0) {
          console.log(`Number of items: ${messageData.graphData.value.length}`);
          console.log('First item:', JSON.stringify(messageData.graphData.value[0], null, 2));
        }
      } else {
        console.log('❌ No graph data returned');
      }
    } else {
      console.log(`❌ Failed to process message (status ${messageResponse.status})`);
      console.log('Response:', JSON.stringify(messageData, null, 2));
    }
  } catch (error) {
    console.log(`❌ Error testing message endpoint: ${error.message}`);
  }
  
  // Step 3: Test the test-data endpoint
  console.log('\n3. Testing /api/test-data endpoint...');
  try {
    const testDataResponse = await fetch(`${CLAUDE_APP_URL}/api/test-data`);
    
    if (testDataResponse.ok) {
      const testData = await testDataResponse.json();
      console.log('✅ Successfully retrieved test data!');
      console.log(`Number of test users: ${testData.users ? testData.users.length : 0}`);
    } else {
      console.log(`❌ Failed to retrieve test data (status ${testDataResponse.status})`);
    }
  } catch (error) {
    console.log(`❌ Error testing test-data endpoint: ${error.message}`);
  }
  
  console.log('\n==========================================');
  console.log('TEST COMPLETE');
  console.log('==========================================');
}

// Run the test
runTest().catch(console.error);
