# Claude Integration with MCP for Microsoft Graph API

This repository provides a complete solution for integrating Claude with a Model Context Protocol (MCP) server to access Microsoft Graph API.

## Step-by-Step Implementation Guide

### Phase 1: Setting Up the MCP Server

1. **Clone this repository**
   ```bash
   git clone https://github.com/JBAgent/Test1.git
   cd Test1
   ```

2. **Install dependencies for the MCP server**
   ```bash
   cd mcp-server
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Azure AD credentials
   ```

4. **Start the MCP server**
   ```bash
   npm start
   ```

5. **Test the MCP server**
   ```bash
   curl -X POST http://localhost:3000/api/graph \
     -H "Content-Type: application/json" \
     -H "X-User-ID: default-user" \
     -d '{"endpoint": "/users", "method": "GET", "queryParams": {"$top": 5}, "allData": false}'
   ```

### Phase 2: Setting Up the Claude Integration

1. **Install dependencies for the Claude application**
   ```bash
   cd ../claude-app
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Anthropic API key and MCP server URL
   ```

3. **Start the Claude application**
   ```bash
   npm start
   ```

4. **Test the Claude integration**
   ```bash
   curl -X POST http://localhost:4000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "How many users are in our organization?"}]}'
   ```

### Phase 3: Customizing the Integration

1. **Add more Graph API functions**
   - Edit `claude-mcp-integration.js` to add specialized functions
   - Update function definitions in `claude-app.js`

2. **Customize the system prompt**
   - Edit the system prompt in `claude-app.js` to tailor Claude's behavior
   - Add domain-specific context for better responses

3. **Implement caching (optional)**
   - Add Redis for caching common Graph API responses
   - Update the MCP server to check cache before making API calls

4. **Add monitoring and logging**
   - Implement logging for all Graph API requests
   - Set up monitoring for the MCP server and Claude application

## Project Structure

```
Test1/
├── mcp-server/               # MCP Server for Microsoft Graph API
│   ├── server.js             # Main server implementation
│   ├── package.json          # Dependencies
│   ├── Dockerfile            # Container configuration
│   └── .env.example          # Example environment variables
│
├── claude-app/               # Claude Application
│   ├── claude-app.js         # Main application server
│   ├── claude-mcp-integration.js  # Integration module
│   ├── package.json          # Dependencies
│   └── .env.example          # Example environment variables
│
└── docs/                     # Documentation
    └── integration-guide.md  # Detailed integration guide
```

## Environment Variables

### MCP Server (.env)
```
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
PORT=3000
```

### Claude Application (.env)
```
ANTHROPIC_API_KEY=your-anthropic-api-key
MCP_SERVER_URL=http://localhost:3000
MCP_USER_ID=default-user
PORT=4000
```

## API Endpoints

### MCP Server

- **POST /api/graph**
  - Makes requests to Microsoft Graph API
  - Requires `X-User-ID` header for authentication
  - Body contains Graph API request options

### Claude Application

- **POST /api/chat**
  - Sends messages to Claude with Graph API capabilities
  - Body contains message array and optional system prompt

- **POST /api/analyze-organization**
  - Specialized endpoint for organizational analysis
  - Simplifies asking questions about the organization

## Security Considerations

1. **Authentication**
   - MCP server uses Azure AD authentication for Graph API
   - Claude application should implement proper authentication

2. **Authorization**
   - MCP server enforces permissions based on user context
   - Implement role-based access control for sensitive operations

3. **Data Protection**
   - Be mindful of data shared with Claude
   - Implement data retention policies

4. **Audit Logging**
   - Log all Graph API requests for compliance
   - Monitor for unusual access patterns

## Troubleshooting

1. **MCP Server Connection Issues**
   - Verify Azure AD credentials
   - Check network connectivity

2. **Claude API Errors**
   - Validate Anthropic API key
   - Ensure request format is correct

3. **Graph API Errors**
   - Check permissions in Azure AD
   - Verify request format and parameters
   - Look for rate limiting issues

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
