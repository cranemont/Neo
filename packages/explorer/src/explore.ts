import type { UserInput } from './codegen/UserInput.js';
import { Gemini } from './llm/google/Gemini.js';
import { PlaywrightCodegen } from './codegen/PlaywrightCodegen.js';
import { MCPClient } from './mcp/MCPClient.js';
import { ExecutionContext } from './codegen/ExecutionContext.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export async function explore(
  maxAttempts: number,
  scenario: string,
  baseUrl: string,
  inputs: UserInput[],
  apiKey: string,
  domainContext: string[],
  precondition: string,
  browserOptions?: {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    tracesDir?: string;
    userDataDir?: string;
    outputDir?: string;
    isolated?: boolean;
    saveTrace?: boolean;
  },
) {
  let mcp: Client;

  try {
    // const llmClient = new Claude(apiKey);
    const llmClient = new Gemini(apiKey);

    mcp = new Client({ name: 'playwright-codegen', version: '1.0.0' });
    const args = ['../playwright-mcp/dist/server.js'];

    if (browserOptions?.browser) {
      args.push('--browser', browserOptions.browser);
    }
    if (browserOptions?.headless !== undefined) {
      args.push('--headless', browserOptions.headless.toString());
    }
    if (browserOptions?.tracesDir) {
      args.push('--traces-dir', browserOptions.tracesDir);
    }
    if (browserOptions?.userDataDir) {
      args.push('--user-data-dir', browserOptions.userDataDir);
    }
    if (browserOptions?.outputDir) {
      args.push('--output-dir', browserOptions.outputDir);
    }
    if (browserOptions?.isolated !== undefined) {
      args.push('--isolated', browserOptions.isolated.toString());
    }
    if (browserOptions?.saveTrace !== undefined) {
      args.push('--save-trace', browserOptions.saveTrace.toString());
    }

    const transport = new StdioClientTransport({
      command: process.execPath,
      args,
      env: {
        ...process.env,
        PRECONDITION_NAME: precondition,
      },
    });
    await mcp.connect(transport);

    const codegen = new PlaywrightCodegen(llmClient, new MCPClient(mcp));
    const context = ExecutionContext.init(scenario, baseUrl, inputs, domainContext);

    const result = await codegen.generate(context);

    console.log(`\`\`\`result\n${JSON.stringify(result)}\n\`\`\``);
    return result;
  } catch (e) {
    console.log(e);
  } finally {
    // @ts-ignore
    if (mcp) {
      await mcp.close();
    }
  }
}
