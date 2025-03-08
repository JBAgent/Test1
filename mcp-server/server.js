/**
 * MCP Server for Microsoft Graph API
 * 
 * A Model Context Protocol server that connects to Microsoft Graph API
 * and provides a unified interface for making Graph API requests.
 */

const express = require('express');
const msal = require('@azure/msal-node');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Initialize express app
const app = express();
app.use(cors());

// Configure body parser with more robust error handling
app.use(bodyParser.json({
  strict: false,
  limit: '10mb',
  reviver: (key, value) => {
    // Custom JSON parsing logic if needed
    return value;
  }
}));

// Error handler for JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err.message);
    return res.status(400).json({ 
      error: 'Bad Request', 
      message: 'Invalid JSON format in request body. Please check that your request uses valid JSON with double quotes.' 
    });
  }
  next(err);
});

// Request logger for debugging
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.method === 'POST' && req.path === '/api/graph') {
      console.log('Request headers:', req.headers);
      console.log('Parsed request body:', JSON.stringify(req.body, null, 2));
    }
    next();
  });
}

// ==========================================
// MSAL Configuration for authentication
// ==========================================
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
};

const tokenRequest = {
  scopes: ['https://graph.microsoft.com/.default']
};

const msalClient = new msal.ConfidentialClientApplication(msalConfig);

// ==========================================
// GraphQuery Service Implementation
// ==========================================
const graphService = {
  /**
   * Makes a request to Microsoft Graph API
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response from Graph API
   */
  async graphQuery(options) {
    // Validate required parameters
    if (!options || !options.endpoint) {
      throw new Error('Graph API endpoint is required');
    }

    // Set default values
    const method = (options.method || 'GET').toUpperCase();
    const version = options.version || 'beta';
    const headers = options.headers || {};
    const body = options.body || null;
    const queryParams = options.queryParams || {};
    const allData = options.allData || false;
    
    // Validate method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid HTTP method: ${method}. Supported methods: ${validMethods.join(', ')}`);
    }
    
    // Validate version
    const validVersions = ['beta', 'v1.0'];
    if (!validVersions.includes(version)) {
      throw new Error(`Invalid API version: ${version}. Supported versions: ${validVersions.join(', ')}`);
    }
    
    try {
      // Get access token for Microsoft Graph
      const authResult = await msalClient.acquireTokenByClientCredential(tokenRequest);
      const accessToken = authResult.accessToken;
      
      // Build the request URL
      let baseUrl = `https://graph.microsoft.com/${version}`;
      let endpoint = options.endpoint.startsWith('/') ? options.endpoint : `/${options.endpoint}`;
      
      // Add consistencyLevel=eventual to all requests
      queryParams['consistencyLevel'] = 'eventual';
      
      // Convert query parameters to URL string
      const queryString = Object.entries(queryParams)
        .map(([key, value]) => {
          // Safely encode values, handling different types
          const encodedValue = typeof value === 'object' ? 
            encodeURIComponent(JSON.stringify(value)) : 
            encodeURIComponent(String(value));
          return `${encodeURIComponent(key)}=${encodedValue}`;
        })
        .join('&');
      
      let url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
      
      // Prepare fetch options
      const fetchOptions = {
        method,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          ...headers
        }
      };
      
      // Add body for POST, PUT, PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        fetchOptions.headers['Content-Type'] = 'application/json';
        // Ensure body is properly stringified if it's an object
        fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : body;
      }
      
      // Function to make a single request
      async function makeRequest(requestUrl) {
        console.log(`Making request to: ${requestUrl}`);
        const response = await fetch(requestUrl, fetchOptions);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(`Graph API error (${response.status}): ${JSON.stringify(errorData) || response.statusText}`);
        }
        
        return await response.json();
      }
      
      // Initial request
      let result = await makeRequest(url);
      
      // Handle pagination if allData is true
      if (allData && result.value && result['@odata.nextLink']) {
        let allItems = [...result.value];
        let nextLink = result['@odata.nextLink'];
        
        while (nextLink) {
          // Make the next request
          const nextPage = await makeRequest(nextLink);
          
          // Add items to our collection
          allItems = [...allItems, ...nextPage.value];
          
          // Update nextLink for the next iteration
          nextLink = nextPage['@odata.nextLink'];
        }
        
        // Return all collected items
        return {
          value: allItems,
          '@odata.count': allItems.length
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error in Graph API request:', error);
      throw error;
    }
  }
};

// ==========================================
// MCP Context Implementation
// ==========================================
class MCPContext {
  constructor(userId) {
    this.userId = userId;
    this.permissions = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // In a real implementation, fetch user permissions from your authorization system
      // This is a simplified example
      const userPermissions = await this.fetchUserPermissions();
      this.permissions = userPermissions;
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize MCP context:', error);
      throw error;
    }
  }

  async fetchUserPermissions() {
    // In a real system, this would query your permissions database
    // For this example, we'll return some default permissions
    return [
      'User.Read.All',
      'Group.Read.All',
      'Sites.Read.All'
    ];
  }

  hasPermission(requiredPermission) {
    return this.permissions.includes(requiredPermission);
  }

  getPermissionForEndpoint(endpoint, method) {
    // Map Graph endpoints to permissions based on endpoint and method
    // This is a simplified implementation
    if (endpoint.startsWith('/users') && method === 'GET') return 'User.Read.All';
    if (endpoint.startsWith('/users') && ['POST', 'PUT', 'PATCH'].includes(method)) return 'User.ReadWrite.All';
    if (endpoint.startsWith('/groups') && method === 'GET') return 'Group.Read.All';
    if (endpoint.startsWith('/groups') && ['POST', 'PUT', 'PATCH'].includes(method)) return 'Group.ReadWrite.All';
    
    // Default permission for unknown endpoints
    return 'Directory.ReadWrite.All';
  }
}

// ==========================================
// MCP Server API Routes
// ==========================================

// Middleware to create MCP context for each request
app.use(async (req, res, next) => {
  try {
    // Extract user ID from authorization header or token
    // This would be replaced with your actual auth mechanism
    const userId = req.headers['x-user-id'] || 'default-user';
    
    // Create and initialize MCP context
    const mcpContext = new MCPContext(userId);
    await mcpContext.initialize();
    
    // Attach context to request
    req.mcpContext = mcpContext;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized', message: error.message });
  }
});

// Main Graph API endpoint
app.post('/api/graph', async (req, res) => {
  try {
    // Check for required fields
    if (!req.body || !req.body.endpoint) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields. "endpoint" is required.'
      });
    }
    
    const { endpoint, method, version, body, queryParams, allData } = req.body;
    
    // Check permission for this endpoint
    const requiredPermission = req.mcpContext.getPermissionForEndpoint(endpoint, method);
    if (!req.mcpContext.hasPermission(requiredPermission)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Missing required permission: ${requiredPermission}` 
      });
    }
    
    // Make Graph API request
    const result = await graphService.graphQuery({
      endpoint,
      method,
      version,
      body,
      queryParams,
      allData
    });
    
    // Return result
    res.json(result);
  } catch (error) {
    console.error('Error handling /api/graph request:', error);
    res.status(500).json({ 
      error: 'Graph API Error', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' ? 
      'An unexpected error occurred' : 
      err.message
  });
});

// ==========================================
// Start the server
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});

module.exports = app; // For testing