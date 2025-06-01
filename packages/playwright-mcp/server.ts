import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// @ts-ignore - Workaround for module resolution issue
import { createConnection } from '../node_modules/@playwright/mcp/lib/connection.js';

export async function server() {
  const mcpServer = await createConnection({
    browser: {
      browserName: 'chromium',
      launchOptions: {
        headless: false,
      },
      userDataDir: './browser-data',
    },
  });

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

server().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
