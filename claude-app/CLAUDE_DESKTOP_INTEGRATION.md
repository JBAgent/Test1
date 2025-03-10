# Integrating with Claude Desktop

This guide explains how to connect your Graph API integration to Claude Desktop.

## Prerequisites

1. **Claude Desktop Application**: Make sure you have Claude Desktop installed on your machine
2. **Running Servers**: Both your MCP server and Claude app server should be running
3. **Node.js and npm**: Required for running the application

## Setting Up the Integration

### Step 1: Start the Servers

First, start both servers in separate terminal windows:

```bash
# Terminal 1: Start the MCP server
cd C:\Graph\Test1\mcp-server
node server.js

# Terminal 2: Start the Claude application
cd C:\Graph\Test1\claude-app
node claude-app.js
```

Verify both servers are running by visiting:
- MCP Server: http://localhost:3000/health
- Claude App: http://localhost:4000/health

### Step 2: Configure Claude Desktop

#### Method A: Using OpenAPI/AI Plugin Standard (Recommended)

Claude Desktop may support the OpenAPI/AI Plugin standard, which makes tool integration easier:

1. Open Claude Desktop
2. Navigate to Settings > Tools or a similar section
3. Add a new custom tool
4. Enter the URL: `http://localhost:4000/.well-known/ai-plugin.json`
5. Complete any additional authentication steps if needed

The application is designed to expose standard discovery endpoints that Claude Desktop can use to automatically configure the tool.

#### Method B: Manual Configuration

If auto-discovery isn't supported, you can manually configure the tool:

1. Open Claude Desktop 
2. Navigate to Settings > Tools or Extensions
3. Add a new tool with these details:
   - Name: "Graph API Tool"
   - Description: "Access Microsoft Graph API data from Claude"
   - Schema URL: `http://localhost:4000/api/tool-schema`
   - Base URL: `http://localhost:4000`
   - Endpoint: `/api/tools`

### Step 3: Test the Integration

1. Start a new conversation in Claude Desktop
2. Ask a question that would require Graph API data, for example:
   - "Who are the top 5 users in our organization?"
   - "Show me the marketing team members"
   - "List all groups in the company"

3. Claude should recognize this as a query for organizational data and use your tool to fetch the information

## Troubleshooting

### Connection Issues

If Claude Desktop isn't connecting to your tools:

1. **Check Both Servers**: Ensure both the MCP server and Claude app are running
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:4000/health
   ```

2. **Verify Tool Endpoints**: Test the tool endpoints directly
   ```bash
   # Test the tool schema endpoint
   curl http://localhost:4000/api/tool-schema
   
   # Test the OpenAPI spec
   curl http://localhost:4000/.well-known/openapi.yaml
   
   # Test the AI plugin manifest
   curl http://localhost:4000/.well-known/ai-plugin.json
   ```

3. **Check CORS Settings**: If Claude Desktop is having issues connecting, it might be a CORS issue
   - The app has CORS enabled, but you may need to add specific origins
   - Edit the CORS configuration in claude-app.js if needed

4. **Firewall Issues**: Check if your firewall is blocking localhost connections

### No Data from Graph API

If the tool connects but doesn't return data from Graph API:

1. **Run the Environment Check**:
   ```bash
   cd C:\Graph\Test1\claude-app
   node check-env.js
   ```

2. **Test Without MCP**:
   ```bash
   node test-without-mcp.js
   ```

3. **Check MCP Server Logs**: Look for any errors in the MCP server terminal

4. **Verify Azure AD Credentials**: If the MCP server connects but returns no data, it might be an issue with your Azure AD credentials for Graph API
   - Check the `.env` file in your mcp-server directory
   - Ensure your Azure AD application has the required API permissions

### Using Fallback Data

If the Graph API integration isn't working properly, you can still test the Claude Desktop integration using fallback data:

1. Set the `FALLBACK_RESPONSES=true` environment variable in the claude-app `.env` file
2. Restart the Claude app server

This will return mock data for all requests, allowing you to test the integration without a working Graph API connection.

## How It Works

### Architecture

The integration follows this flow:

1. User asks a question in Claude Desktop
2. Claude recognizes that organizational data is needed
3. Claude calls your local tool endpoint (`/api/tools`)
4. Your Claude app processes the request and calls the MCP server
5. MCP server authenticates with Azure AD and queries Microsoft Graph API
6. Results flow back through the chain to Claude
7. Claude presents the data to the user

### Protocol Support

This application supports multiple integration methods:

1. **OpenAPI/AI Plugin Standard**: Modern way to describe tool capabilities
2. **Direct Tool Protocol**: Simple JSON-RPC style API endpoints
3. **Legacy Messages API**: Simple POST requests with message arrays

## Advanced Configuration

### Environment Variables

You can customize the behavior with these variables in your `.env` file:

```
# Server configuration
PORT=4000
MCP_SERVER_URL=http://localhost:3000
MCP_USER_ID=default-user

# Feature flags
FALLBACK_RESPONSES=false  # Set to true to use mock data always
LOG_LEVEL=info  # Set to debug for more verbose logging
```

### Customizing Tool Capabilities

To modify what the tool can do:

1. Edit `tool-protocol.js` to change the schema and handling logic
2. Update the OpenAPI specification in claude-app.js
3. Restart the Claude app server

## Security Considerations

1. The tool runs on localhost and should not be exposed to the internet
2. All data is processed locally and not sent to external services
3. Graph API permissions are governed by the Azure AD application credentials
4. Consider implementing additional authentication if deploying in a multi-user environment
