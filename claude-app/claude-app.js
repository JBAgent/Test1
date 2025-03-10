/**
 * Main application file for Claude MCP integration
 * This file serves as the entry point referenced in package.json
 */

require('dotenv').config();
const express = require('express');
const ClaudeMCPIntegration = require('./claude-mcp-integration');
const { sanitizeRequestBody, sanitizeJsonString } = require('./sanitize-request');

// Create express app
const app = express();
const PORT = process.env.PORT || 3000;

// Custom middleware to handle JSON parsing errors
const jsonErrorHandler = (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    console.error('Received payload:', req.body);
    console.error('Raw body:', req.rawBody);
    
    // Try to fix the JSON if it's a single-quotes issue
    if (req.rawBody) {
      try {
        const sanitized = sanitizeJsonString(req.rawBody);
        const data = JSON.parse(sanitized);
        
        // If we successfully parsed it, handle the request with the sanitized data
        req.body = data;
        console.log('Successfully sanitized malformed JSON');
        return next();
      } catch (e) {
        console.error('Failed to sanitize JSON:', e.message);
      }
    }
    
    return res.status(400).json({ 
      error: 'Invalid JSON in request body',
      details: err.message,
      help: 'Ensure all quotes are double quotes (") not single quotes (\') and all property names are quoted'
    });
  }
  
  next(err);
};

// Configure middleware
// First add our custom sanitizer
app.use(sanitizeRequestBody);

// Only if the body hasn't been sanitized already, use express.json parser
app.use((req, res, next) => {
  if (!req.bodySanitized) {
    express.json({
      verify: (req, res, buf) => {
        req.rawBody = buf.toString();
      }
    })(req, res, next);
  } else {
    next();
  }
});

// Add the JSON error handler
app.use(jsonErrorHandler);

// Log all environment variables for debugging (except secrets)
console.log('Environment Configuration:');
console.log(`- PORT: ${process.env.PORT || 3000}`);
console.log(`- MCP_SERVER_URL: ${process.env.MCP_SERVER_URL || 'http://localhost:3000'}`);
console.log(`- MCP_USER_ID: ${process.env.MCP_USER_ID || 'default-user'}`);
console.log(`- API_KEY: ${process.env.API_KEY ? '[SET]' : '[NOT SET]'}`);
console.log(`- ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '[SET]' : '[NOT SET]'}`);

// Initialize the Claude MCP integration
const claudeMcpIntegration = new ClaudeMCPIntegration({
  mcpServerUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY,
  userId: process.env.MCP_USER_ID || 'default-user'
});

// Create Claude functions for Graph API
const claudeFunctions = claudeMcpIntegration.createClaudeFunctions();

// Debug endpoint to check JSON format
app.post('/api/debug', (req, res) => {
  res.json({
    message: 'JSON received and parsed successfully',
    receivedData: req.body,
    rawBody: req.rawBody || 'Not available'
  });
});

// Process user message and return graph data
app.post('/api/process-message', async (req, res) => {
  console.log('Received process-message request with body:', JSON.stringify(req.body, null, 2));
  
  // Check if we have a valid message
  if (!req.body || !req.body.messages || !Array.isArray(req.body.messages)) {
    return res.status(400).json({
      error: 'Invalid request format',
      help: 'Request should include a \"messages\" array'
    });
  }
  
  try {
    // Extract user message from the messages array
    const userMessage = req.body.messages.find(msg => msg.role === 'user');
    if (!userMessage) {
      return res.status(400).json({
        error: 'No user message found',
        help: 'The messages array must contain at least one message with role \"user\"'
      });
    }
    
    console.log('User content:', userMessage.content);
    
    // Simplified logic to detect graph queries
    // In a real system, you'd use Claude to interpret the query
    const content = userMessage.content.toLowerCase();
    
    let result = null;
    
    if (content.includes('user') || content.includes('people')) {
      // Get users info
      console.log('Detected user query, fetching users from Graph API');
      try {
        result = await claudeFunctions.getUsers({
          queryParams: {
            '$top': 5,
            '$select': 'displayName,mail,jobTitle'
          }
        });
        console.log('Graph API response:', JSON.stringify(result, null, 2));
      } catch (graphError) {
        console.error('Error fetching from Graph API:', graphError);
        result = { error: graphError.message };
      }
    } else if (content.includes('group')) {
      // Get groups info
      console.log('Detected group query, fetching groups from Graph API');
      try {
        result = await claudeFunctions.getGroups({
          queryParams: {
            '$top': 5
          }
        });
        console.log('Graph API response:', JSON.stringify(result, null, 2));
      } catch (graphError) {
        console.error('Error fetching from Graph API:', graphError);
        result = { error: graphError.message };
      }
    } else {
      // Generic response if no specific query detected
      result = { message: 'No specific graph query detected in the user message' };
    }
    
    // Return the result
    res.json({
      result: result,
      original_message: userMessage.content
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Error processing message', details: error.message });
  }
});

// Claude messages endpoint (specifically to handle Anthropic API format)
app.post('/api/messages', async (req, res) => {
  console.log('Received messages request with body type:', typeof req.body);
  
  // Check if we have a 'messages' field
  if (req.body && req.body.messages) {
    console.log('Messages received:', JSON.stringify(req.body.messages, null, 2));
    
    // Extract question from the user message
    const userMessages = req.body.messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      const userQuery = userMessages[userMessages.length - 1].content;
      console.log('Processing user query:', userQuery);
      
      // Try to get data from Graph API based on the query
      try {
        let result;
        if (userQuery.toLowerCase().includes('user')) {
          console.log('Detected user query, fetching from Graph API...');
          result = await claudeFunctions.getUsers({
            queryParams: {
              '$top': 5,
              '$select': 'displayName,mail,jobTitle'
            }
          });
        } else {
          console.log('No specific entity type detected, using generic graph query');
          result = await claudeFunctions.graphQuery({
            endpoint: '/users',
            method: 'GET',
            queryParams: {
              '$top': 5
            }
          });
        }
        
        console.log('Graph API result:', result ? 'Data received' : 'No data');
        
        if (result) {
          console.log('MCP server response:', JSON.stringify(result, null, 2));
        } else {
          console.log('No results from MCP server');
          // Provide fallback data
          result = {
            value: [
              { id: "user1", displayName: "John Doe", mail: "john.doe@example.com", jobTitle: "Software Engineer" },
              { id: "user2", displayName: "Jane Smith", mail: "jane.smith@example.com", jobTitle: "Product Manager" },
              { id: "user3", displayName: "Robert Johnson", mail: "robert.johnson@example.com", jobTitle: "UX Designer" },
              { id: "user4", displayName: "Emily Davis", mail: "emily.davis@example.com", jobTitle: "Marketing Specialist" },
              { id: "user5", displayName: "Michael Wilson", mail: "michael.wilson@example.com", jobTitle: "Sales Representative" }
            ],
            message: "Fallback data used because MCP server returned no results"
          };
        }
        
        res.json({
          message: 'Messages processed successfully',
          graphData: result,
          messageCount: req.body.messages.length
        });
      } catch (error) {
        console.error('Error fetching from Graph API:', error);
        
        // Provide fallback response with mock data
        const fallbackData = {
          value: [
            { id: "user1", displayName: "John Doe", mail: "john.doe@example.com", jobTitle: "Software Engineer" },
            { id: "user2", displayName: "Jane Smith", mail: "jane.smith@example.com", jobTitle: "Product Manager" },
            { id: "user3", displayName: "Robert Johnson", mail: "robert.johnson@example.com", jobTitle: "UX Designer" },
            { id: "user4", displayName: "Emily Davis", mail: "emily.davis@example.com", jobTitle: "Marketing Specialist" },
            { id: "user5", displayName: "Michael Wilson", mail: "michael.wilson@example.com", jobTitle: "Sales Representative" }
          ],
          message: "Fallback data used because Graph API request failed"
        };
        
        res.json({
          message: 'Messages received but Graph API query failed',
          error: error.message,
          graphData: fallbackData,
          messageCount: req.body.messages.length
        });
      }
    } else {
      res.json({
        message: 'Messages received successfully, but no user message found',
        messageCount: req.body.messages.length
      });
    }
  } else {
    console.error('Invalid message format. Body:', JSON.stringify(req.body, null, 2));
    res.status(400).json({
      error: 'Invalid message format',
      help: 'Request should include a \"messages\" array'
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
  res.json({ 
    status: 'ok', 
    message: 'Claude MCP integration is running',
    config: {
      mcp_server_url: process.env.MCP_SERVER_URL || 'http://localhost:3000',
      port: PORT
    }
  });
});

// Test data endpoint for when MCP is unavailable
app.get('/api/test-data', (req, res) => {
  res.json({
    users: [
      { id: "user1", displayName: "John Doe", mail: "john.doe@example.com", jobTitle: "Software Engineer" },
      { id: "user2", displayName: "Jane Smith", mail: "jane.smith@example.com", jobTitle: "Product Manager" },
      { id: "user3", displayName: "Robert Johnson", mail: "robert.johnson@example.com", jobTitle: "UX Designer" },
      { id: "user4", displayName: "Emily Davis", mail: "emily.davis@example.com", jobTitle: "Marketing Specialist" },
      { id: "user5", displayName: "Michael Wilson", mail: "michael.wilson@example.com", jobTitle: "Sales Representative" }
    ],
    message: "Test data - not from actual Graph API"
  });
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