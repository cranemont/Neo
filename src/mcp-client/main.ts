import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { program } from 'commander';
import { ClaudeClient } from './llm/ClaudeClient.js';
import { UserInput } from './codegen/UserInput.js';
import { PlaywrightCodegen } from './codegen/PlaywrightCodegen.js';
import { ScenarioContext } from './codegen/ScenarioContext.js';

async function main(
  maxAttempts: number,
  scenario: string,
  baseUrl: string,
  inputs: UserInput[],
  apiKey: string,
  mcpServer: string,
) {
  let mcpClient: Client;

  try {
    const llmClient = new ClaudeClient(apiKey);

    mcpClient = new Client({ name: 'playwright-codegen', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [mcpServer],
    });
    await mcpClient.connect(transport);

    const codegen = new PlaywrightCodegen(llmClient, mcpClient);
    const context = new ScenarioContext(scenario, baseUrl, inputs);

    await codegen.generate(context);
  } catch (e) {
    console.log(e);
  } finally {
    if (mcpClient) {
      await mcpClient.close();
    }
    process.exit(0);
  }
}

program
  .option('--scenario, -s <scenario>', 'scenario to run')
  .option('--url, -u <baseUrl>', 'base URL to start from')
  .option('--input, -i <inputs...>', 'user inputs')
  .option('--max-attempts -m <maxAttempts>', 'maximum number of attempts to reach the final state')
  .option('--api-key, -k <apiKey>', 'API key for the LLM')
  .option('--mcp-server, -p <server>', 'MCP server to connect to')
  .action(async (options) => {
    const inputs = options.input
      ? options.input.map((input) => {
          const [key, value, description] = input.split(',');
          return UserInput.of(key, value, description);
        })
      : [];

    await main(Number(options.maxAttempts), options.scenario, options.url, inputs, options.apiKey, options.mcpServer);
  });

program.parse();
