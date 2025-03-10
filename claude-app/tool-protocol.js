/**
 * Tool Protocol Handler for Claude Integration
 * 
 * This module implements the Claude tool protocol for integration with Claude desktop
 * and other Claude interfaces that support tool calling.
 */

// Schema for the Graph API tools
const toolSchema = {
  "type": "function",
  "function": {
    "name": "query_graph_api",
    "description": "Query Microsoft Graph API for organizational data",
    "parameters": {
      "type": "object",
      "properties": {
        "entity_type": {
          "type": "string",
          "enum": ["users", "groups", "sites", "teams"],
          "description": "The type of entity to query"
        },
        "query_type": {
          "type": "string",
          "enum": ["list", "search", "get", "count"],
          "description": "The type of query to perform"
        },
        "limit": {
          "type": "integer",
          "description": "Maximum number of results to return",
          "default": 5
        },
        "filter": {
          "type": "string",
          "description": "OData filter expression",
          "default": ""
        },
        "select": {
          "type": "string",
          "description": "Comma-separated list of properties to include",
          "default": ""
        },
        "search": {
          "type": "string",
          "description": "Search term for finding specific entities",
          "default": ""
        }
      },
      "required": ["entity_type", "query_type"]
    }
  }
};

/**
 * Process a tool call from Claude
 * @param {Object} toolCall - The tool call object from Claude
 * @param {Object} claudeFunctions - Functions for interacting with Graph API
 * @returns {Promise<Object>} - The result to return to Claude
 */
async function processToolCall(toolCall, claudeFunctions) {
  try {
    console.log('Processing tool call:', JSON.stringify(toolCall, null, 2));
    
    if (!toolCall || !toolCall.function || !toolCall.function.name) {
      throw new Error('Invalid tool call format');
    }
    
    const functionName = toolCall.function.name;
    const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
    
    console.log(`Tool function: ${functionName}, Arguments:`, args);
    
    // Handle the Graph API query function
    if (functionName === 'query_graph_api') {
      return await handleGraphApiQuery(args, claudeFunctions);
    } else {
      throw new Error(`Unknown function: ${functionName}`);
    }
  } catch (error) {
    console.error('Error processing tool call:', error);
    return {
      error: error.message,
      fallback_data: {
        message: "An error occurred while processing your request",
        sample_data: getSampleData(error)
      }
    };
  }
}

/**
 * Handle a Graph API query
 * @param {Object} args - The arguments for the query
 * @param {Object} claudeFunctions - Functions for interacting with Graph API
 * @returns {Promise<Object>} - The query result
 */
async function handleGraphApiQuery(args, claudeFunctions) {
  const { entity_type, query_type, limit, filter, select, search } = args;
  
  console.log(`Handling Graph API query: ${entity_type} ${query_type}`);
  
  // Construct query parameters
  const queryParams = {};
  
  // Add $top parameter for result limit
  if (limit) {
    queryParams['$top'] = limit;
  } else {
    queryParams['$top'] = 5; // Default limit
  }
  
  // Add $select parameter for field selection
  if (select) {
    queryParams['$select'] = select;
  } else {
    // Default selections based on entity type
    if (entity_type === 'users') {
      queryParams['$select'] = 'id,displayName,mail,jobTitle,department';
    } else if (entity_type === 'groups') {
      queryParams['$select'] = 'id,displayName,description,visibility';
    }
  }
  
  // Add $filter parameter
  if (filter) {
    queryParams['$filter'] = filter;
  }
  
  // Add $search parameter if provided
  if (search) {
    queryParams['$search'] = `"${search}"`; // Quoted for OData
  }
  
  console.log('Constructed query parameters:', queryParams);
  
  try {
    let result;
    
    // Execute the appropriate function based on entity type
    switch (entity_type) {
      case 'users':
        result = await claudeFunctions.getUsers({ queryParams });
        break;
      case 'groups':
        result = await claudeFunctions.getGroups({ queryParams });
        break;
      default:
        // For other entity types, use the generic graphQuery function
        result = await claudeFunctions.graphQuery({
          endpoint: `/${entity_type}`,
          method: 'GET',
          queryParams
        });
    }
    
    // Process the result for the specific query type
    switch (query_type) {
      case 'count':
        if (result && result.value) {
          return {
            count: result.value.length,
            message: `Found ${result.value.length} ${entity_type}`
          };
        }
        break;
      case 'search':
      case 'list':
      case 'get':
      default:
        return result;
    }
    
    return result;
  } catch (error) {
    console.error(`Error executing Graph API query for ${entity_type}:`, error);
    throw error;
  }
}

/**
 * Get sample data for fallback responses
 * @param {Error} error - The error that occurred
 * @returns {Object} - Sample data based on context
 */
function getSampleData(error) {
  return {
    users: [
      { id: "user1", displayName: "John Doe", mail: "john.doe@example.com", jobTitle: "Software Engineer" },
      { id: "user2", displayName: "Jane Smith", mail: "jane.smith@example.com", jobTitle: "Product Manager" }
    ],
    groups: [
      { id: "group1", displayName: "Engineering Team", description: "Software development team" },
      { id: "group2", displayName: "Marketing Team", description: "Marketing and communications team" }
    ],
    error: error.message
  };
}

/**
 * Generate a tool response for Claude
 * @param {Object} toolCall - The original tool call
 * @param {Object} result - The result from processing the tool call
 * @returns {Object} - Formatted response for Claude
 */
function generateToolResponse(toolCall, result) {
  return {
    tool_call_id: toolCall.id,
    output: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  };
}

// Export the functions and schema
module.exports = {
  toolSchema,
  processToolCall,
  handleGraphApiQuery,
  generateToolResponse
};
