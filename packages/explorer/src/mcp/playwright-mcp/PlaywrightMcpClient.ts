import { MCPClient } from '../MCPClient.js';
import type { BrowserOptionsType } from '../../config.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class PlaywrightMcpClient extends MCPClient {
  private EXECUTION_PATH = '../playwright-mcp/dist/server.js';
  private args = [this.EXECUTION_PATH];

  constructor(browserOptions: BrowserOptionsType, contextId: string) {
    super(new Client({ name: 'playwright-codegen', version: '1.0.0' }));

    if (browserOptions.browser) {
      this.args.push('--browser', browserOptions.browser);
    }
    if (browserOptions.headless !== undefined) {
      this.args.push('--headless', browserOptions.headless.toString());
    }
    if (browserOptions.tracesDir) {
      this.args.push('--traces-dir', `${browserOptions.tracesDir}/${contextId}`);
    }
    if (browserOptions.userDataDir) {
      this.args.push('--user-data-dir', `${browserOptions.userDataDir}/${contextId}`);
    }
    if (browserOptions.outputDir) {
      this.args.push('--output-dir', `${browserOptions.outputDir}/${contextId}`);
    }
    if (browserOptions.isolated !== undefined) {
      this.args.push('--isolated', browserOptions.isolated.toString());
    }
    if (browserOptions.saveTrace !== undefined) {
      this.args.push('--save-trace', browserOptions.saveTrace.toString());
    }
  }

  override async connect() {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: this.args,
    });

    await super.connect(transport);
  }
}
