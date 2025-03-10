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
 * Simple middleware that captures raw request body for debugging
 */
function captureRawBody(req, res, next) {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = data;
    
    // If it looks like JSON with single quotes, try to sanitize it
    if (req.rawBody && 
        (req.rawBody.trim().startsWith("{") || 
         req.rawBody.trim().startsWith("'{"))) {
      try {
        const sanitized = sanitizeJsonString(req.rawBody);
        req.sanitizedBody = sanitized;
      } catch (e) {
        console.error('Failed to pre-sanitize body:', e.message);
      }
    }
    next();
  });
}

/**
 * Express middleware to handle JSON parsing errors by attempting to sanitize the JSON
 */
function handleJsonParsingErrors(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    console.error('Raw body:', req.rawBody);
    
    // Try to sanitize the raw body
    if (req.rawBody) {
      try {
        const sanitized = sanitizeJsonString(req.rawBody);
        const data = JSON.parse(sanitized);
        
        // If we successfully parsed it, attach it to the request and continue
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
}

module.exports = {
  sanitizeJsonString,
  captureRawBody,
  handleJsonParsingErrors
};
