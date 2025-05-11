// Import StdioServerTransport normally
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Import type for createConnection for TypeScript
import type { createConnection as CreateConnectionType } from '@playwright/mcp';

// Creates a headless Playwright MCP server with SSE transport

// @ts-ignore - Workaround for module resolution issue
const { createConnection } = await import('./mcp-fix.js');

async function server() {
  const mcpServer = await createConnection({
    browser: {
      browserName: 'chromium',
      launchOptions: {
        headless: false,
      },
    },
  });
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

await server();
