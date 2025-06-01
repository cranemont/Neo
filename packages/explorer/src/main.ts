import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { program } from 'commander';
import { UserInput } from './codegen/UserInput.js';
import { PlaywrightCodegen } from './codegen/PlaywrightCodegen.js';
import { Gemini } from './llm/google/Gemini.js';
import { ExecutionContext } from './codegen/ExecutionContext.js';
import { MCPClient } from './mcp/MCPClient.js';

async function main(maxAttempts: number, scenario: string, baseUrl: string, inputs: UserInput[], apiKey: string, domainContext: Record<string, string> = {}) {
  let mcp: Client;

  try {
    // const llmClient = new Claude(apiKey);
    const llmClient = new Gemini(apiKey);

    mcp = new Client({ name: 'playwright-codegen', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['../playwright-mcp/dist/server.js'],
    });
    await mcp.connect(transport);

    const codegen = new PlaywrightCodegen(llmClient, new MCPClient(mcp));
    const context = ExecutionContext.init(scenario, baseUrl, inputs, domainContext);

    const result = await codegen.generate(context);

    console.log(`\`\`\`result\n${JSON.stringify(result)}\n\`\`\``);
  } catch (e) {
    console.log(e);
  } finally {
    // @ts-ignore
    if (mcp) {
      await mcp.close();
    }
    process.exit(0);
  }
}

program
  .option('--scenario, -s <scenario>', 'scenario to run')
  .option('--url, -u <baseUrl>', 'base URL to start from')
  .option('--input, -i <inputs...>', 'user inputs')
  .option('--domain-context, -d <domainContext...>', 'domain context')
  .option('--max-attempts -m <maxAttempts>', 'maximum number of attempts to reach the final state')
  .option('--api-key, -k <apiKey>', 'API key for the LLM')
  .action(async (options) => {
    const inputs = options.input
      ? options.input.map((input) => {
          const [key, value, description] = input.split(',');
          return UserInput.of(key, value, description);
        })
      : [];

    const domainContext: Record<string, string> = {};
    if (options.domainContext) {
      for (const context of options.domainContext) {
        const [key, value] = context.split(',');
        if (key && value) {
          domainContext[key] = value;
        }
      }
    }

    await main(Number(options.maxAttempts), options.scenario, options.url, inputs, options.apiKey, domainContext);
  });

program.parse();
