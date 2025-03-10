/**
 * MCP Server Adapter for Claude Integration
 * 
 * This file implements the Model Context Protocol (MCP) server specification
 * to allow Claude Desktop to connect to our Graph API tool.
 * 
 * Based on: https://modelcontextprotocol.io/quickstart/server
 */

const express = require('express');
const cors = require('cors');
const ClaudeMCPIntegration = require('./claude-mcp-integration');

// Create a router for MCP endpoints
function createMCPRouter(claudeFunctions) {
  const router = express.Router();
  
  // Enable CORS for all routes
  router.use(cors());
  router.use(express.json());
  
  // MCP Server Information Endpoint
  router.get('/', (req, res) => {
    res.json({
      name: "Graph API MCP Server",
      description: "MCP server for Microsoft Graph API access",
      vendor: "Custom Integration",
      version: "1.0.0",
      protocol_version: "0.1.0",
      status: "healthy"
    });
  });
  
  // MCP Context Types Endpoint
  router.get('/context_types', (req, res) => {
    res.json({
      context_types: [
        {
          name: "ms_graph_api",
          description: "Microsoft Graph API connector",
          auth_requirement: "none"
        }
      ]
    });
  });
  
  // MCP Context Type Detail Endpoint
  router.get('/context_types/ms_graph_api', (req, res) => {
    res.json({
      name: "ms_graph_api",
      description: "Access Microsoft Graph API for organizational data",
      auth_requirement: "none",
      parameters: {
        required: [],
        optional: ["endpoint", "query_type", "limit", "filter"]
      },
      capabilities: {
        users: {
          description: "Get information about users in the organization"
        },
        groups: {
          description: "Get information about groups in the organization"
        }
      }
    });
  });
  
  // MCP Context Creation Endpoint
  router.post('/contexts', (req, res) => {
    // Create a new context
    const contextId = "ctx_" + Math.random().toString(36).substring(2, 15);
    
    res.json({
      context_id: contextId,
      context_type: "ms_graph_api",
      status: "ready",
      expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    });
  });
  
  // MCP Context Status Endpoint
  router.get('/contexts/:contextId', (req, res) => {
    res.json({
      context_id: req.params.contextId,
      context_type: "ms_graph_api",
      status: "ready",
      expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    });
  });
  
  // MCP Query Endpoint
  router.post('/contexts/:contextId/query', async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Query parameter is required"
        });
      }
      
      console.log("Received MCP query:", JSON.stringify(query, null, 2));
      
      // Parse the natural language query
      const normalizedQuery = query.toLowerCase();
      
      // Determine what type of data is being requested
      let result;
      if (normalizedQuery.includes('user') || normalizedQuery.includes('people') || normalizedQuery.includes('employee')) {
        console.log("Detected user query, fetching users");
        
        // Extract a limit if mentioned
        let limit = 5; // default
        const limitMatch = normalizedQuery.match(/top\s+(\d+)/i) || normalizedQuery.match(/(\d+)\s+user/i);
        if (limitMatch && limitMatch[1]) {
          limit = parseInt(limitMatch[1], 10);
        }
        
        // Look for department filters
        let filter = null;
        if (normalizedQuery.includes('marketing')) {
          filter = "department eq 'Marketing'";
        } else if (normalizedQuery.includes('sales')) {
          filter = "department eq 'Sales'";
        } else if (normalizedQuery.includes('engineering')) {
          filter = "department eq 'Engineering'";
        }
        
        // Construct query parameters
        const queryParams = {
          '$top': limit,
          '$select': 'displayName,mail,jobTitle,department'
        };
        
        if (filter) {
          queryParams['$filter'] = filter;
        }
        
        try {
          result = await claudeFunctions.getUsers({ queryParams });
        } catch (err) {
          console.error("Error fetching users:", err);
          
          // Return fallback data
          result = {
            value: [
              { id: "user1", displayName: "John Doe", mail: "john.doe@example.com", jobTitle: "Software Engineer", department: "Engineering" },
              { id: "user2", displayName: "Jane Smith", mail: "jane.smith@example.com", jobTitle: "Product Manager", department: "Product" },
              { id: "user3", displayName: "Robert Johnson", mail: "robert.johnson@example.com", jobTitle: "UX Designer", department: "Design" },
              { id: "user4", displayName: "Emily Davis", mail: "emily.davis@example.com", jobTitle: "Marketing Specialist", department: "Marketing" },
              { id: "user5", displayName: "Michael Wilson", mail: "michael.wilson@example.com", jobTitle: "Sales Representative", department: "Sales" }
            ],
            _source: "fallback" // Add indicator this is fallback data
          };
        }
      } else if (normalizedQuery.includes('group') || normalizedQuery.includes('team') || normalizedQuery.includes('department')) {
        console.log("Detected group query, fetching groups");
        
        try {
          result = await claudeFunctions.getGroups({
            queryParams: {
              '$top': 10,
              '$select': 'displayName,description'
            }
          });
        } catch (err) {
          console.error("Error fetching groups:", err);
          
          // Return fallback data
          result = {
            value: [
              { id: "group1", displayName: "Engineering Team", description: "Software development team" },
              { id: "group2", displayName: "Marketing Team", description: "Marketing and communications team" },
              { id: "group3", displayName: "Sales Team", description: "Sales and customer relations team" },
              { id: "group4", displayName: "Product Team", description: "Product management team" },
              { id: "group5", displayName: "Design Team", description: "UX/UI design team" }
            ],
            _source: "fallback" // Add indicator this is fallback data
          };
        }
      } else {
        // Generic response for queries we can't categorize
        result = {
          message: "I'm not sure what organizational data you're looking for. You can ask about users or groups."
        };
      }
      
      // Return the result in MCP format
      res.json({
        answer: formatMCPResponse(result, normalizedQuery)
      });
    } catch (error) {
      console.error("Error processing MCP query:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  });
  
  return router;
}

/**
 * Format a Graph API response for MCP
 * @param {Object} result - The result from Graph API
 * @param {string} query - The original query
 * @returns {string} - Formatted response for MCP
 */
function formatMCPResponse(result, query) {
  if (!result) {
    return "I couldn't retrieve any data from the Microsoft Graph API.";
  }
  
  if (result.error) {
    return `Error retrieving data: ${result.error}`;
  }
  
  if (result.message) {
    return result.message;
  }
  
  if (result.value && Array.isArray(result.value)) {
    if (result.value.length === 0) {
      return "No results found for your query.";
    }
    
    // Determine what kind of data we have
    const firstItem = result.value[0];
    
    if (firstItem.mail) {
      // This is user data
      const isFallback = result._source === "fallback";
      const fallbackNotice = isFallback ? " (Note: Using sample data as I couldn't connect to the actual Graph API)" : "";
      
      let response = `I found ${result.value.length} user(s) in the organization${fallbackNotice}:\n\n`;
      
      result.value.forEach((user, index) => {
        response += `${index + 1}. ${user.displayName}`;
        if (user.jobTitle) response += ` - ${user.jobTitle}`;
        if (user.department) response += `, ${user.department} Department`;
        if (user.mail) response += ` (${user.mail})`;
        response += '\n';
      });
      
      return response;
    } else {
      // This is probably group data
      const isFallback = result._source === "fallback";
      const fallbackNotice = isFallback ? " (Note: Using sample data as I couldn't connect to the actual Graph API)" : "";
      
      let response = `I found ${result.value.length} group(s)${fallbackNotice}:\n\n`;
      
      result.value.forEach((group, index) => {
        response += `${index + 1}. ${group.displayName}`;
        if (group.description) response += `: ${group.description}`;
        response += '\n';
      });
      
      return response;
    }
  }
  
  // If we can't determine the format, return the raw JSON
  return `Here's the data I found: ${JSON.stringify(result, null, 2)}`;
}

module.exports = {
  createMCPRouter
};
