/**
 * Claude API Handler
 * 
 * Processes natural language queries from Claude and passes them to the MCP server
 */

/**
 * Process a message from Claude and extract Graph API related requests
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} claudeFunctions - Functions for interacting with Graph API
 * @returns {Promise<Object>} - Response with Graph API data
 */
async function processClaudeMessages(messages, claudeFunctions) {
  try {
    console.log(`Processing ${messages.length} messages`);
    
    // Extract the latest user message
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length === 0) {
      return { error: 'No user messages found' };
    }
    
    const latestUserMessage = userMessages[userMessages.length - 1];
    console.log(`Latest user message: ${latestUserMessage.content}`);
    
    // Extract query content from the user message
    const query = extractGraphQuery(latestUserMessage.content);
    if (!query) {
      return { message: 'No Graph API query detected in the message' };
    }
    
    // Determine which Graph API function to call
    const result = await executeGraphQuery(query, claudeFunctions);
    
    return {
      query,
      result
    };
  } catch (error) {
    console.error('Error processing Claude messages:', error);
    return { 
      error: error.message,
      fallbackData: getFallbackData(error)
    };
  }
}

/**
 * Extract a Graph API query from a natural language message
 * @param {string} message - User message content
 * @returns {Object|null} - Extracted query or null if none detected
 */
function extractGraphQuery(message) {
  // Check if the message contains common Graph API query patterns
  const userPatterns = [
    'users', 'employees', 'people', 'staff', 'team members', 
    'user', 'employee', 'person', 'staff member'
  ];
  
  const groupPatterns = [
    'groups', 'teams', 'departments', 'organizations', 
    'group', 'team', 'department', 'organization'
  ];
  
  const actionPatterns = {
    list: ['list', 'show', 'get', 'display', 'find', 'search', 'who'],
    top: ['top', 'first', 'most', 'highest', 'largest', 'best'],
    count: ['count', 'how many', 'total number', 'number of']
  };
  
  // Normalize message for pattern matching
  const normalizedMessage = message.toLowerCase();
  
  // Determine what entity type the query is about
  let entityType = null;
  if (userPatterns.some(pattern => normalizedMessage.includes(pattern))) {
    entityType = 'users';
  } else if (groupPatterns.some(pattern => normalizedMessage.includes(pattern))) {
    entityType = 'groups';
  }
  
  if (!entityType) {
    return null; // No recognized entity type
  }
  
  // Determine the action type
  let action = 'list';
  for (const [actionType, patterns] of Object.entries(actionPatterns)) {
    if (patterns.some(pattern => normalizedMessage.includes(pattern))) {
      action = actionType;
      break;
    }
  }
  
  // Extract parameters
  const params = {
    top: extractNumberParameter(normalizedMessage, 'top'),
    select: extractSelectFields(normalizedMessage, entityType),
    filter: extractFilterCondition(normalizedMessage, entityType)
  };
  
  return {
    entityType,
    action,
    params,
    originalText: message
  };
}

/**
 * Extract a number parameter from a message
 * @param {string} message - Normalized message
 * @param {string} paramType - Type of parameter to extract
 * @returns {number|null} - Extracted number or null
 */
function extractNumberParameter(message, paramType) {
  if (paramType === 'top') {
    // Look for patterns like "top 5", "first 10", etc.
    const topPattern = /\b(top|first)\s+(\d+)\b/i;
    const match = message.match(topPattern);
    if (match && match[2]) {
      return parseInt(match[2], 10);
    }
    
    // Default value if there's a top indication but no number
    if (message.match(/\b(top|first)\b/i)) {
      return 5; // Default to top 5
    }
  }
  
  return null;
}

/**
 * Extract select fields from a message
 * @param {string} message - Normalized message
 * @param {string} entityType - Type of entity (users, groups)
 * @returns {string|null} - Comma-separated select fields or null
 */
function extractSelectFields(message, entityType) {
  // Common fields to select based on entity type
  const commonFields = {
    users: ['id', 'displayName', 'mail', 'jobTitle'],
    groups: ['id', 'displayName', 'description']
  };
  
  // Check if specific fields are mentioned
  const fieldMapping = {
    users: {
      name: 'displayName',
      email: 'mail',
      role: 'jobTitle',
      title: 'jobTitle',
      position: 'jobTitle',
      department: 'department',
      phone: 'mobilePhone',
      manager: 'manager'
    },
    groups: {
      name: 'displayName',
      description: 'description',
      members: 'members',
      owners: 'owners'
    }
  };
  
  const entityFields = fieldMapping[entityType] || {};
  const requestedFields = [];
  
  // Check each possible field
  for (const [term, field] of Object.entries(entityFields)) {
    if (message.includes(term)) {
      requestedFields.push(field);
    }
  }
  
  // If no specific fields mentioned, use common fields
  if (requestedFields.length === 0) {
    return commonFields[entityType].join(',');
  }
  
  // Always include id and displayName for reference
  if (!requestedFields.includes('id')) requestedFields.unshift('id');
  if (!requestedFields.includes('displayName') && entityType === 'users') {
    requestedFields.push('displayName');
  }
  
  return [...new Set(requestedFields)].join(',');
}

/**
 * Extract filter conditions from a message
 * @param {string} message - Normalized message
 * @param {string} entityType - Type of entity (users, groups)
 * @returns {string|null} - OData filter expression or null
 */
function extractFilterCondition(message, entityType) {
  // This is a simplified implementation - for production you'd use NLP
  // to extract filter conditions more intelligently
  
  if (entityType === 'users') {
    // Check for department filter
    if (message.includes('marketing')) {
      return "department eq 'Marketing'";
    }
    if (message.includes('sales')) {
      return "department eq 'Sales'";
    }
    if (message.includes('engineering') || message.includes('developers')) {
      return "department eq 'Engineering'";
    }
    
    // Check for job title filter
    if (message.includes('manager')) {
      return "jobTitle eq 'Manager'";
    }
    if (message.includes('developer')) {
      return "jobTitle eq 'Developer'";
    }
  }
  
  return null;
}

/**
 * Execute a Graph API query based on the extracted query parameters
 * @param {Object} query - Extracted query information
 * @param {Object} claudeFunctions - Functions for interacting with Graph API
 * @returns {Promise<Object>} - Query result
 */
async function executeGraphQuery(query, claudeFunctions) {
  console.log(`Executing Graph query for ${query.entityType}, action: ${query.action}`);
  
  try {
    const { entityType, action, params } = query;
    
    // Construct query parameters
    const queryParams = {};
    
    // Add $top parameter
    if (params.top) {
      queryParams['$top'] = params.top;
    } else {
      queryParams['$top'] = 10; // Default limit
    }
    
    // Add $select parameter
    if (params.select) {
      queryParams['$select'] = params.select;
    }
    
    // Add $filter parameter
    if (params.filter) {
      queryParams['$filter'] = params.filter;
    }
    
    console.log(`Constructed query parameters:`, queryParams);
    
    // Execute the appropriate Graph API function
    let result;
    if (entityType === 'users') {
      result = await claudeFunctions.getUsers({ queryParams });
    } else if (entityType === 'groups') {
      result = await claudeFunctions.getGroups({ queryParams });
    } else {
      throw new Error(`Unsupported entity type: ${entityType}`);
    }
    
    return {
      data: result,
      query: { entityType, action, queryParams }
    };
  } catch (error) {
    console.error('Error executing Graph query:', error);
    throw error;
  }
}

/**
 * Get fallback data when a real API call fails
 * @param {Error} error - The error that occurred
 * @returns {Object} - Fallback data for the response
 */
function getFallbackData(error) {
  // Generate sample data for testing
  return {
    message: "Using sample data because the Graph API request failed",
    sampleUsers: [
      { id: "user1", displayName: "John Doe", mail: "john.doe@example.com", jobTitle: "Software Engineer" },
      { id: "user2", displayName: "Jane Smith", mail: "jane.smith@example.com", jobTitle: "Product Manager" },
      { id: "user3", displayName: "Robert Johnson", mail: "robert.johnson@example.com", jobTitle: "UX Designer" },
      { id: "user4", displayName: "Emily Davis", mail: "emily.davis@example.com", jobTitle: "Marketing Specialist" },
      { id: "user5", displayName: "Michael Wilson", mail: "michael.wilson@example.com", jobTitle: "Sales Representative" }
    ],
    sampleGroups: [
      { id: "group1", displayName: "Engineering Team", description: "Software development team" },
      { id: "group2", displayName: "Marketing Team", description: "Marketing and communications team" },
      { id: "group3", displayName: "Sales Team", description: "Sales and customer relations team" }
    ],
    error: error.message
  };
}

module.exports = {
  processClaudeMessages,
  extractGraphQuery,
  executeGraphQuery
};
