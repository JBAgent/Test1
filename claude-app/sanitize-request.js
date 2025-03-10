/**
 * Request Sanitizer
 * 
 * Helper utility to fix common JSON formatting issues in requests
 * before they reach the Express JSON parser
 */

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
 * Express middleware to sanitize request bodies before JSON parsing
 */
function sanitizeRequestBody(req, res, next) {
  let data = '';
  
  // Store the original data listener
  const originalListener = req.listeners('data')[0];
  // Remove the original data listener
  req.removeListener('data', originalListener);
  
  // Add our custom data listener
  req.on('data', chunk => {
    data += chunk;
  });
  
  // Store the original end listener
  const originalEndListener = req.listeners('end')[0];
  // Remove the original end listener
  req.removeListener('end', originalEndListener);
  
  // Add our custom end listener
  req.on('end', () => {
    // Store the raw body for debugging
    req.rawBody = data;
    
    // Attempt to sanitize the data
    if (data && data.length > 0) {
      try {
        const sanitized = sanitizeJsonString(data);
        // Create a new readable stream with the sanitized data
        const newStream = new (require('stream').Readable)();
        newStream.push(sanitized);
        newStream.push(null);
        
        // Restore the original data listener on the new stream
        newStream.on('data', originalListener.bind(req));
        // Restore the original end listener on the new stream
        newStream.on('end', originalEndListener.bind(req));
        
        // Trigger the data event on the new stream
        newStream.resume();
      } catch (e) {
        // If something goes wrong during sanitization, just use the original data
        console.error('Error in sanitization:', e);
        const newStream = new (require('stream').Readable)();
        newStream.push(data);
        newStream.push(null);
        
        newStream.on('data', originalListener.bind(req));
        newStream.on('end', originalEndListener.bind(req));
        
        newStream.resume();
      }
    } else {
      // If there's no data, just call the original end listener
      originalEndListener.call(req);
    }
  });
}

module.exports = {
  sanitizeJsonString,
  sanitizeRequestBody
};
