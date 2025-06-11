import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { type Connection, createConnection } from '@playwright/mcp';
import { program } from "commander";
import logger from './logger.js';

// const preconditionsDir = path.resolve(process.cwd(), '../explorer/preconditions');
//
// async function extractTestCode(filePath: string): Promise<string> {
//   const content = await fs.promises.readFile(filePath, 'utf-8');
//   const testMatch = content.match(/test\(['"](.+)['"],\s*async\s*\(\{\s*page\s*\}\)\s*=>\s*{([\s\S]*?)}\);/);
//   if (!testMatch) {
//     throw new Error('No test found in file');
//   }
//   return testMatch[2].trim();
// }
//
// function createTestFunction(testCode: string): (page: Page) => Promise<void> {
//   return new Function(
//     'page',
//     `
//     return (async () => {
//       ${testCode}
//     })();
//   `,
//   ) as (page: Page) => Promise<void>;
// }
//
// async function loadInitializationCode(preconditionName: string): Promise<(page: Page) => Promise<void>> {
//   try {
//     const testFilePath = path.join(preconditionsDir, `${preconditionName}.spec.ts`);
//
//     try {
//       await fs.promises.access(testFilePath);
//     } catch {
//       throw new Error(`Precondition file not found: ${preconditionName}.spec.ts`);
//     }
//
//     const testCode = await extractTestCode(testFilePath);
//     console.error(testCode);
//     return createTestFunction(testCode);
//   } catch (error) {
//     console.error('Failed to load initialization code:', error);
//     throw error;
//   }
// }
//
// const originalSetupBrowserContext = Context.prototype._setupBrowserContext;
// Context.prototype._setupBrowserContext = async function () {
//   const result = await originalSetupBrowserContext.call(this);
//
//   if (this._currentTab) {
//     try {
//       const preconditionName = process.env.PRECONDITION_NAME;
//       if (!preconditionName) {
//         console.log('No precondition specified. Skipping initialization.');
//         return result;
//       }
//
//       const initializationCode = await loadInitializationCode(preconditionName);
//       console.error(initializationCode.toString());
//       await initializationCode(this._currentTab.page);
//       console.error(`Initialization code from ${preconditionName}.spec.ts executed successfully`);
//     } catch (error) {
//       console.error('Failed to execute initialization code:', error);
//       const errorPage = this._currentTab.page;
//       this._currentTab.page = await result.browserContext.newPage();
//       await errorPage.close();
//     }
//   }
//
//   return result;
// };

interface ServerOptions {
  browserName: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  tracesDir?: string;
  userDataDir?: string;
  outputDir?: string;
  isolated: boolean;
  saveTrace: boolean;
}

// TODO: implement contextGetter to use preconditions

export class PlaywrightServer {
  private connection: Connection | null = null;
  private options: ServerOptions;

  constructor(options: ServerOptions) {
    this.options = options;
  }

  async start() {
    logger.info(`Starting Playwright server with options: ${JSON.stringify(this.options)}`);

    try {
      this.connection = await createConnection({
        browser: {
          browserName: this.options.browserName,
          isolated: this.options.isolated,
          launchOptions: {
            headless: this.options.headless,
            tracesDir: this.options.tracesDir,
          },
          userDataDir: this.options.userDataDir,
        },
        saveTrace: this.options.saveTrace,
        outputDir: this.options.outputDir,
      });

      const transport = new StdioServerTransport();
      await this.connection.server.connect(transport);

      return this.connection;
    } catch (error) {
      logger.error('Error starting Playwright server:', error);
      throw error;
    }
  }

  async stop() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}

program
  .option('-b, --browser <browser>', 'browser type (chromium, firefox, webkit)')
  .option('-h, --headless [boolean]', 'run in headless mode')
  .option('-t, --traces-dir [dir]', 'directory to save trace files')
  .option('-u, --user-data-dir [dir]', 'browser user data directory')
  .option('-o, --output-dir [dir]', 'directory to save downloaded files')
  .option('-i, --isolated [boolean]', 'enable browser isolation mode')
  .option('-s, --save-trace [boolean]', 'save trace files')
  .action(async (options) => {
    const server = new PlaywrightServer({
      browserName: options.browser as 'chromium' | 'firefox' | 'webkit',
      headless: options.headless === 'true',
      tracesDir: options.tracesDir,
      userDataDir: options.userDataDir,
      outputDir: options.outputDir,
      isolated: options.isolated === 'true',
      saveTrace: options.saveTrace === 'true',
    });

    const cleanup = async () => {
      logger.info('Server stopped');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    try {
      await server.start();
      logger.info('Server started');
    } catch (error) {
      logger.error('Error starting server:', error);
      await cleanup();
    }
  });

program.parse();
