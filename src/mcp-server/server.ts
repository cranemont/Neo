// Import StdioServerTransport normally
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Import type for createConnection for TypeScript

// Creates a headless Playwright MCP server with SSE transport

// @ts-ignore - Workaround for module resolution issue
const { createConnection } = await import('./mcp-fix.js');

export async function server() {
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

server().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
