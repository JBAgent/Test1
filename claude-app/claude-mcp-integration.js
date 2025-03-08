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
  }

  /**
   * Make a request to the MCP server
   * @param {Object} graphOptions - Graph API request options
   * @returns {Promise<Object>} - Response from the MCP server
   */
  async makeGraphRequest(graphOptions) {
    try {
      const response = await fetch(`${this.mcpServerUrl}/api/graph`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': this.userId,
          'X-API-Key': this.apiKey || ''
        },
        body: JSON.stringify(graphOptions)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`MCP Server Error: ${errorData.message || response.statusText}`);
      }

      return await response.json();
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
        return await self.makeGraphRequest(options);
      },
      
      /**
       * Get user information from Microsoft Graph
       * @param {Object} options - Query options
       * @returns {Promise<Object>} - User data
       */
      getUsers: async function(options = {}) {
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