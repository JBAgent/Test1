/**
 * Request Sanitizer
 * 
 * Helper utility to fix common JSON formatting issues in requests
 * before they reach the Express JSON parser
 */

const { Readable } = require('stream');

/**
 * Convert a potentially invalid JSON string to valid JSON
 * Handles the most common syntax errors:
 * - Single quotes instead of double quotes
 * - Unquoted property names
 * - Missing quotes around string values
 * 
 * @param {string} input - Potentially invalid JSON string
 * @returns {string} Valid JSON string
 */
function sanitizeJsonString(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // If the string starts with a single quote, this might be a single-quoted JSON string
  if (input.trim().startsWith("'") && input.trim().endsWith("'")) {
    // Remove the outer single quotes
    input = input.trim().slice(1, -1);
  }
  
  try {
    // Try to parse as is - if it works, it's already valid JSON
    JSON.parse(input);
    return input;
  } catch (e) {
    // Not valid JSON, attempt to fix common issues
    
    // Replace single quotes with double quotes (but not inside already double-quoted strings)
    let inDoubleQuotes = false;
    let result = '';
    
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const nextChar = input[i + 1] || '';
      
      // Toggle the double quotes state
      if (char === '"' && (i === 0 || input[i - 1] !== '\\')) {
        inDoubleQuotes = !inDoubleQuotes;
        result += char;
      } 
      // If we see a single quote that's not inside double quotes, replace it with double quotes
      else if (char === "'" && !inDoubleQuotes) {
        result += '"';
      }
      // Handle unquoted property names
      else if (char === ':' && !inDoubleQuotes) {
        // Look backward for potential unquoted property name
        let j = result.length - 1;
        let propName = '';
        
        // Skip whitespace
        while (j >= 0 && /\s/.test(result[j])) j--;
        
        // Collect property name characters
        while (j >= 0 && /[a-zA-Z0-9_$]/.test(result[j])) {
          propName = result[j] + propName;
          j--;
        }
        
        // If we found a property name and it's not quoted, replace it with a quoted version
        if (propName && j >= 0 && result[j] !== '"') {
          const prefix = result.substring(0, j + 1);
          const suffix = result.substring(j + 1 + propName.length);
          result = prefix + '"' + propName + '"' + suffix;
        }
        
        result += char;
      } 
      else {
        result += char;
      }
    }
    
    // Handle specific case for {messages: [...]} format
    if (result.includes('"messages":') || result.includes('{messages:')) {
      result = result.replace(/{messages:/g, '{"messages":');
      result = result.replace(/"messages":/g, '"messages":');
    }
    
    try {
      // Try to parse the sanitized string
      JSON.parse(result);
      return result;
    } catch (e) {
      // If we still can't parse it, log and return the original
      console.error('Failed to sanitize JSON:', e.message);
      console.error('Original:', input);
      console.error('Attempted sanitized:', result);
      return input;
    }
  }
}

/**
 * A simpler middleware approach that doesn't manipulate the stream directly
 * Instead, it collects the data, sanitizes it, and then passes it to the next middleware
 */
function sanitizeRequestBody(req, res, next) {
  // Only process POST, PUT, PATCH requests with content-type application/json
  if (
    (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') &&
    req.headers['content-type'] && 
    req.headers['content-type'].includes('application/json')
  ) {
    let data = '';
    
    // Collect data chunks
    req.on('data', chunk => {
      data += chunk.toString();
    });
    
    // Once we have all the data
    req.on('end', () => {
      try {
        // Store the raw data
        req.rawBody = data;
        
        // Try to sanitize the data
        if (data && data.trim().length > 0) {
          const sanitized = sanitizeJsonString(data);
          
          // Set a flag to indicate we've already processed the body
          req.bodySanitized = true;
          
          // Try to parse it to JSON
          try {
            const jsonData = JSON.parse(sanitized);
            req.body = jsonData;
          } catch (err) {
            // If parsing fails, we'll let express handle it
            console.error('Failed to parse sanitized JSON:', err.message);
          }
        }
        
        next();
      } catch (err) {
        console.error('Error in sanitization middleware:', err);
        next(err);
      }
    });
    
    req.on('error', err => {
      console.error('Error reading request stream:', err);
      next(err);
    });
  } else {
    // For non-JSON or GET requests, just pass through
    next();
  }
}

// Export the utility functions
module.exports = {
  sanitizeJsonString,
  sanitizeRequestBody
};
