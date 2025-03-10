/**
 * Claude Integration with MCP Server
 * 
 * This module enables Claude to interact with the MCP server to access Microsoft Graph API
 */

const fetch = require('node-fetch');

class ClaudeMCPIntegration {
  /**
   * Initialize the Claude-MCP integration
   * @param {Object} config - Configuration options
   * @param {string} config.mcpServerUrl - URL of the MCP server
   * @param {string} config.apiKey - API key for Claude (if applicable)
   * @param {string} config.userId - User ID for MCP authentication
   */
  constructor(config) {
    this.mcpServerUrl = config.mcpServerUrl;
    this.apiKey = config.apiKey;
    this.userId = config.userId;
    
    console.log(`ClaudeMCPIntegration initialized with MCP server URL: ${this.mcpServerUrl}`);
    console.log(`Using User ID: ${this.userId}`);
  }

  /**
   * Make a request to the MCP server
   * @param {Object} graphOptions - Graph API request options
   * @returns {Promise<Object>} - Response from the MCP server
   */
  async makeGraphRequest(graphOptions) {
    try {
      console.log(`Making Graph API request to MCP server: ${this.mcpServerUrl}/api/graph`);
      console.log(`Request options: ${JSON.stringify(graphOptions, null, 2)}`);
      
      // Ensure endpoint starts with /
      if (graphOptions.endpoint && !graphOptions.endpoint.startsWith('/')) {
        graphOptions.endpoint = '/' + graphOptions.endpoint;
      }

      const requestBody = JSON.stringify(graphOptions);
      console.log(`Request body: ${requestBody}`);
      
      const response = await fetch(`${this.mcpServerUrl}/api/graph`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.userId,
          'X-API-Key': this.apiKey || ''
        },
        body: requestBody
      });

      console.log(`Response status: ${response.status}`);
      
      // Get the raw response body
      const responseText = await response.text();
      console.log(`Raw response: ${responseText}`);
      
      // Parse the response if it's JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`Failed to parse response as JSON: ${parseError.message}`);
        throw new Error(`Failed to parse MCP server response: ${responseText}`);
      }

      if (!response.ok) {
        console.error(`MCP Server Error: ${JSON.stringify(responseData)}`);
        throw new Error(`MCP Server Error (${response.status}): ${responseData.message || responseData.error || response.statusText}`);
      }

      console.log(`Successfully received response from MCP server`);
      return responseData;
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      throw error;
    }
  }

  /**
   * Create a Claude function toolkit for Graph API interactions
   * @returns {Object} - Claude function toolkit
   */
  createClaudeFunctions() {
    const self = this;
    
    return {
      /**
       * Query Microsoft Graph API through MCP
       * @param {Object} options - Graph API options
       * @returns {Promise<Object>} - Graph API response
       */
      graphQuery: async function(options) {
        console.log(`graphQuery called with options: ${JSON.stringify(options, null, 2)}`);
        return await self.makeGraphRequest(options);
      },
      
      /**
       * Get user information from Microsoft Graph
       * @param {Object} options - Query options
       * @returns {Promise<Object>} - User data
       */
      getUsers: async function(options = {}) {
        console.log(`getUsers called with options: ${JSON.stringify(options, null, 2)}`);
        return await self.makeGraphRequest({
          endpoint: '/users',
          method: 'GET',
          queryParams: options.queryParams || {},
          allData: options.allData || false,
          version: options.version || 'beta'
        });
      },
      
      /**
       * Get group information from Microsoft Graph
       * @param {Object} options - Query options
       * @returns {Promise<Object>} - Group data
       */
      getGroups: async function(options = {}) {
        console.log(`getGroups called with options: ${JSON.stringify(options, null, 2)}`);
        return await self.makeGraphRequest({
          endpoint: '/groups',
          method: 'GET',
          queryParams: options.queryParams || {},
          allData: options.allData || false,
          version: options.version || 'beta'
        });
      },
      
      /**
       * Create a new user in Microsoft Graph
       * @param {Object} userData - User data
       * @returns {Promise<Object>} - Created user
       */
      createUser: async function(userData) {
        console.log(`createUser called with data: ${JSON.stringify(userData, null, 2)}`);
        return await self.makeGraphRequest({
          endpoint: '/users',
          method: 'POST',
          body: userData,
          version: 'beta'
        });
      },
      
      /**
       * Update a user in Microsoft Graph
       * @param {string} userId - User ID
       * @param {Object} userData - User data to update
       * @returns {Promise<Object>} - Updated user
       */
      updateUser: async function(userId, userData) {
        console.log(`updateUser called for user ${userId} with data: ${JSON.stringify(userData, null, 2)}`);
        return await self.makeGraphRequest({
          endpoint: `/users/${userId}`,
          method: 'PATCH',
          body: userData,
          version: 'beta'
        });
      }
    };
  }
}

module.exports = ClaudeMCPIntegration;