/**
 * Main application file for Claude MCP integration
 * This file serves as the entry point referenced in package.json
 */

require('dotenv').config();
const express = require('express');
const ClaudeMCPIntegration = require('./claude-mcp-integration');
const { captureRawBody, handleJsonParsingErrors } = require('./sanitize-request');

// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
// Add our raw body capture middleware before the JSON parser
app.use(captureRawBody);

// Configure JSON parsing with verification
app.use(express.json({
  verify: (req, res, buf) => {
    // We already have the raw body from our middleware, but this
    // makes it available for the built-in parser as well
    if (!req.rawBody) {
      req.rawBody = buf.toString();
    }
  }
}));

// Add JSON error handling middleware
app.use(handleJsonParsingErrors);

// Initialize the Claude MCP integration
const claudeMcpIntegration = new ClaudeMCPIntegration({
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:5000',
  apiKey: process.env.API_KEY,
  userId: process.env.USER_ID || 'default-user'
});

// Create Claude functions for Graph API
const claudeFunctions = claudeMcpIntegration.createClaudeFunctions();

// Debug endpoint to check JSON format
app.post('/api/debug', (req, res) => {
  res.json({
    message: 'JSON received and parsed successfully',
    receivedData: req.body,
    rawBody: req.rawBody
  });
});

// Claude messages endpoint (specifically to handle Anthropic API format)
app.post('/api/messages', (req, res) => {
  console.log('Received messages request:', JSON.stringify(req.body, null, 2));
  
  // Check if we have a 'messages' field
  if (req.body && req.body.messages) {
    res.json({
      message: 'Messages received successfully',
      messageCount: req.body.messages.length
    });
  } else {
    res.status(400).json({
      error: 'Invalid message format',
      help: 'Request should include a "messages" array'
    });
  }
});

// API endpoints
app.post('/api/graph-query', async (req, res) => {
  try {
    // Log request for debugging
    console.log('Received graph-query request:', JSON.stringify(req.body, null, 2));
    
    const result = await claudeFunctions.graphQuery(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error in graph-query endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const result = await claudeFunctions.getUsers(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups', async (req, res) => {
  try {
    const result = await claudeFunctions.getGroups(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const result = await claudeFunctions.createUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:userId', async (req, res) => {
  try {
    const result = await claudeFunctions.updateUser(req.params.userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Claude MCP integration is running' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Claude MCP integration server running on port ${PORT}`);
  console.log(`API endpoints available at: http://localhost:${PORT}/api/`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});

// Export for testing purposes
module.exports = app;
