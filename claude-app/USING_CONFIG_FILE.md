# Using the Claude Desktop Configuration File

This guide explains how to use the `claude_desktop_config.json` file to connect your Graph API tool to Claude Desktop.

## What is this configuration file?

The `claude_desktop_config.json` file contains the necessary information for Claude Desktop to understand and interact with your Microsoft Graph API tool. It defines:

- The capabilities of your tool
- The endpoints it exposes
- The parameters it accepts
- How to format requests and responses

## How to use the configuration file

Depending on your Claude Desktop version, there are several ways to use this configuration:

### Method 1: Import Tool Configuration

If Claude Desktop supports importing tool configurations:

1. Navigate to any tool management section in Claude Desktop
2. Look for an option like "Import Tool" or "Add Custom Tool"
3. Select the `claude_desktop_config.json` file from your computer
4. Follow any additional prompts to complete the setup

### Method 2: Tool URL Reference

If Claude Desktop supports adding tools by URL:

1. Make sure your Claude app is running on port 4000
2. In Claude Desktop, look for an option to add a tool by URL
3. Enter: `http://localhost:4000/.well-known/ai-plugin.json`

### Method 3: Manual Tool Creation

If you need to manually configure the tool:

1. In Claude Desktop, look for a "Create Tool" or similar option
2. Enter the following information:
   - Name: Microsoft Graph API Tool
   - Description: Access organizational data through Microsoft Graph API
   - Base URL: http://localhost:4000
   - Endpoint: /api/tools
   - Method: POST
   - Authentication: None

3. For the tool schema, copy the "function" object from the configuration file

### Method 4: Developer Console

If Claude Desktop has a developer console:

1. Open the developer console or developer tools
2. Look for a way to register or define a new tool
3. Paste the contents of the configuration file

## Testing the Connection

Once configured, you can test the tool by asking Claude questions like:

- "Who are the top 5 users in our organization?"
- "How many people work in the marketing department?"
- "Show me a list of all groups in the company"

Claude should recognize these as queries that require organizational data and use your tool to fetch the information.

## Troubleshooting

If the integration doesn't work:

1. **Check the tool server**: Make sure your Claude app is running on port 4000
   ```
   cd C:\Graph\Test1\claude-app
   node claude-app.js
   ```

2. **Verify accessibility**: Test that the tool is accessible:
   ```
   curl http://localhost:4000/health
   ```

3. **Check Claude Desktop logs**: Look for any error messages in Claude Desktop's logs or console

4. **Try alternative formats**: If your version of Claude Desktop doesn't support the current format, you might need to adapt the configuration file

## Advanced: Using the Configuration in Custom Integrations

The configuration file can also be used for custom integrations:

1. **API-based integrations**: Use the schema to format requests to Claude's API
2. **Custom clients**: Build your own Claude client that uses this tool definition
3. **Middleware**: Create middleware that connects Claude to your Graph API tool

## Need Help?

If you continue to have issues:

1. Check for official documentation on tool integration for your specific Claude Desktop version
2. Look for online communities or forums discussing Claude tool integration
3. Consult with Anthropic's support team for guidance specific to your deployment
