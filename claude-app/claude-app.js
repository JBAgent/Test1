/**
 * Main application file for Claude MCP integration
 * This file serves as the entry point referenced in package.json
 */

require('dotenv').config();
const express = require('express');
const ClaudeMCPIntegration = require('./claude-mcp-integration');

// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure middleware
app.use(express.json());

// Initialize the Claude MCP integration
const claudeMcpIntegration = new ClaudeMCPIntegration({
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:5000',
  apiKey: process.env.API_KEY,
  userId: process.env.USER_ID || 'default-user'
});

// Create Claude functions for Graph API
const claudeFunctions = claudeMcpIntegration.createClaudeFunctions();

// API endpoints
app.post('/api/graph-query', async (req, res) => {
  try {
    const result = await claudeFunctions.graphQuery(req.body);
    res.json(result);
  } catch (error) {
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

// Start the server
app.listen(PORT, () => {
  console.log(`Claude MCP integration server running on port ${PORT}`);
});

// Export for testing purposes
module.exports = app;
