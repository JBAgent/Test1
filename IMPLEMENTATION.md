# Step-by-Step Implementation Guide for Claude-MCP Integration

This guide provides detailed instructions for implementing the Claude integration with your MCP server for Microsoft Graph API.

## Phase 1: Setting Up the MCP Server

### 1. Prerequisites

Before starting, ensure you have:
- Node.js 16+ installed
- An Azure AD application registered with appropriate Microsoft Graph API permissions
- Admin consent granted for the required permissions

### 2. Clone and Configure the Repository

```bash
# Clone the repository
git clone https://github.com/JBAgent/Test1.git
cd Test1/mcp-server

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

Edit the `.env` file with your Azure AD application credentials:
```
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
PORT=3000
```

### 3. Start and Test the MCP Server

```bash
# Start the server
npm start
```

Test the server using curl or Postman:
```bash
curl -X GET http://localhost:3000/health

curl -X POST http://localhost:3000/api/graph \
  -H "Content-Type: application/json" \
  -H "X-User-ID: default-user" \
  -d '{
    "endpoint": "/users",
    "method": "GET",
    "queryParams": {"$top": 5},
    "allData": false
  }'
```

## Phase 2: Setting Up the Claude Integration

### 1. Configure the Claude Application

```bash
cd ../claude-app

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

Edit the `.env` file with your configuration:
```
ANTHROPIC_API_KEY=your-anthropic-api-key
MCP_SERVER_URL=http://localhost:3000
MCP_USER_ID=default-user
PORT=4000
```

### 2. Start and Test the Claude Application

```bash
# Start the Claude application
npm start
```

Test the application using curl or Postman:
```bash
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "How many users are in our organization?"
      }
    ]
  }'
```

## Phase 3: Customizing the Integration

### 1. Add More Graph API Functions

The integration comes with basic Graph API functions. You can extend it by adding more specialized functions to `claude-mcp-integration.js`:

```javascript
// Example: Add a function to get Teams data
getTeams: async function(options = {}) {
  return await self.makeGraphRequest({
    endpoint: '/teams',
    method: 'GET',
    queryParams: options.queryParams || {},
    allData: options.allData || false,
    version: options.version || 'beta'
  });
}
```

Then add the corresponding tool definition in `claude-app.js`:

```javascript
{
  name: "getTeams",
  description: "Get Microsoft Teams data",
  input_schema: {
    type: "object",
    properties: {
      queryParams: {
        type: "object",
        description: "URL query parameters"
      },
      allData: {
        type: "boolean",
        default: false
      },
      version: {
        type: "string",
        enum: ["beta", "v1.0"],
        default: "beta"
      }
    }
  }
}
```

### 2. Improve the System Prompt

Enhance Claude's capabilities by customizing the system prompt in `claude-app.js`:

```javascript
system: `You are an organization assistant with access to Microsoft Graph API.
Your goal is to help users understand their Microsoft 365 environment.
When users ask about organizational data, always consider whether you need
to use Graph API to retrieve accurate information. Explain your process
and findings clearly.

Available data includes:
- User information (profiles, departments, job titles)
- Group memberships and properties
- Team structures and channels
- SharePoint sites and permissions

Always respect data privacy and only return information relevant to the query.`
```

### 3. Implement Caching (Optional)

For better performance, add caching for common Graph API requests:

1. Install Redis:
```bash
npm install redis
```

2. Add Redis configuration to `.env`:
```
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

3. Implement caching in the MCP server's GraphQuery service.

### 4. Add Error Handling and Logging

Enhance error handling and add logging for production use:

1. Install logging library:
```bash
npm install winston
```

2. Create a logger module and integrate it with both the MCP server and Claude application.

3. Implement appropriate error handling and retry mechanisms.

## Phase 4: Security Considerations

### 1. Implement Authentication

Add proper authentication to both the MCP server and Claude application:

1. Use JWT or OAuth 2.0 for API authentication
2. Integrate with your organization's identity provider
3. Implement rate limiting and request validation

### 2. Secure Environment Variables

Ensure all sensitive configuration is properly secured:

1. Use a secrets management solution for production
2. Rotate credentials regularly
3. Implement least-privilege access for service accounts

### 3. Audit Logging

Implement comprehensive audit logging:

1. Log all Graph API requests with user context
2. Track Claude's function calls for security review
3. Set up alerts for unusual activity patterns

## Phase 5: Deployment

### 1. Containerize the Applications

Use Docker for deployment:

```bash
# Build MCP server container
cd mcp-server
docker build -t mcp-server .

# Build Claude application container
cd ../claude-app
docker build -t claude-app .
```

### 2. Deploy to Your Environment

Deploy using Docker Compose or Kubernetes, depending on your environment.

### 3. Set Up Monitoring

Implement monitoring for both applications:

1. Health check endpoints
2. Performance metrics
3. Error rate tracking
4. Usage statistics

## Phase 6: Testing and Iteration

### 1. Test with Real Queries

Test the integration with various real-world queries, including:

1. User information requests
2. Organizational structure questions
3. Security and compliance inquiries
4. Resource usage analysis

### 2. Gather Feedback and Iterate

Collect user feedback and iterate on the implementation:

1. Refine system prompts for better Claude responses
2. Add additional Graph API functions based on usage patterns
3. Optimize performance and response times
4. Enhance error messages and user guidance

## Additional Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/overview)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/en/docs/)
- [Example Queries Documentation](./docs/example-queries.md)
- [Integration Guide](./docs/integration-guide.md)

## Troubleshooting

### Common Issues

1. **Authentication Errors**: 
   - Verify Azure AD credentials
   - Check token expiration and refresh logic
   - Confirm correct permissions are granted

2. **Claude API Issues**:
   - Validate Anthropic API key
   - Check for rate limiting
   - Verify request format matches API expectations

3. **Graph API Errors**:
   - Examine error codes from Graph API
   - Check permissions for requested operations
   - Validate query parameters format

4. **Integration Issues**:
   - Confirm network connectivity between components
   - Verify environment variables are correct
   - Check logs for detailed error information
