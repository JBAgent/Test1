# JSON Troubleshooting Guide

## Common JSON Errors

You're encountering a JSON parsing error. The specific error:

```
SyntaxError: Unexpected token ''', "'{messages:" is not valid JSON
```

This indicates that the request body contains invalid JSON format. The most common issues are:

1. **Single quotes instead of double quotes**: JSON requires double quotes (`"`) for strings and property names, not single quotes (`'`).
2. **Unquoted property names**: All property names in JSON must be in double quotes.
3. **Trailing commas**: JSON doesn't allow trailing commas in objects or arrays.
4. **JavaScript syntax in JSON**: JSON is not JavaScript. Functions, comments, and other JS syntax are not valid.

## How to Fix the Error

### For this specific error (single quotes):

The error message shows `"'{messages:"` which suggests you're using single quotes around your JSON or within your JSON object. 

Change:
```
'{messages: [...]}' 
```

To:
```
{"messages": [...]}
```

### Debug Steps:

1. Use the new `/api/debug` endpoint to test your JSON:
   ```
   curl -X POST http://localhost:4000/api/debug -H "Content-Type: application/json" -d '{"test": "data"}'
   ```

2. Check the format of data you're sending to the API:
   - If sending from a web form, ensure it's properly JSON.stringify'd
   - If using curl, make sure to use double quotes inside the JSON and escape them if needed
   - If using a tool like Postman, check if it's set to send JSON (not form data)

## Valid JSON Example

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

## Testing Your JSON

You can validate your JSON using:

1. Online tools like [JSONLint](https://jsonlint.com/)
2. The `/api/debug` endpoint we added to the application
3. Command line tools like `jq`:
   ```
   echo '{"test": "data"}' | jq
   ```

If you continue to face issues, check the server logs for more details about the problematic JSON input.
