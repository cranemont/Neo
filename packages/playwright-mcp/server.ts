import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// @ts-ignore - Workaround for module resolution issue
import { createConnection } from '../node_modules/@playwright/mcp/lib/connection.js';
// @ts-ignore - Workaround for module resolution issue
import { Context } from '../node_modules/@playwright/mcp/lib/context.js';
import type { Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const preconditionsDir = path.resolve(process.cwd(), '../explorer/preconditions');

async function extractTestCode(filePath: string): Promise<string> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const testMatch = content.match(/test\(['"](.+)['"],\s*async\s*\(\{\s*page\s*\}\)\s*=>\s*{([\s\S]*?)}\);/);
  if (!testMatch) {
    throw new Error('No test found in file');
  }
  return testMatch[2].trim();
}

function createTestFunction(testCode: string): (page: Page) => Promise<void> {
  return new Function(
    'page',
    `
    return (async () => {
      ${testCode}
    })();
  `,
  ) as (page: Page) => Promise<void>;
}

async function loadInitializationCode(preconditionName: string): Promise<(page: Page) => Promise<void>> {
  try {
    const testFilePath = path.join(preconditionsDir, `${preconditionName}.spec.ts`);

    try {
      await fs.promises.access(testFilePath);
    } catch {
      throw new Error(`Precondition file not found: ${preconditionName}.spec.ts`);
    }

    const testCode = await extractTestCode(testFilePath);
    console.error(testCode);
    return createTestFunction(testCode);
  } catch (error) {
    console.error('Failed to load initialization code:', error);
    throw error;
  }
}

const originalSetupBrowserContext = Context.prototype._setupBrowserContext;
Context.prototype._setupBrowserContext = async function () {
  const result = await originalSetupBrowserContext.call(this);

  if (this._currentTab) {
    try {
      const preconditionName = process.env.PRECONDITION_NAME;
      if (!preconditionName) {
        console.log('No precondition specified. Skipping initialization.');
        return result;
      }

      const initializationCode = await loadInitializationCode(preconditionName);
      console.error(initializationCode.toString());
      await initializationCode(this._currentTab.page);
      console.error(`Initialization code from ${preconditionName}.spec.ts executed successfully`);
    } catch (error) {
      console.error('Failed to execute initialization code:', error);
      const errorPage = this._currentTab.page;
      this._currentTab.page = await result.browserContext.newPage();
      await errorPage.close();
    }
  }

  return result;
};

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
