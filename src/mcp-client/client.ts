import type { Tool } from '@anthropic-ai/sdk/resources';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { program } from 'commander';
import { UserInput } from '../../poc/main.js';
import { LLMClient } from './LLMClient.js';

const LLM_API_KEY = process.env.CLAUDE_API_KEY || process.env.OPENAI_API_KEY;
if (!LLM_API_KEY) {
  throw new Error('No LLM API key is set (CLAUDE_API_KEY or OPENAI_API_KEY)');
}

export class PlaywrightCodegen {
  private mcp: Client;
  private llmClient: LLMClient;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor(apiKey: string = LLM_API_KEY) {
    this.llmClient = new LLMClient(apiKey);
    this.mcp = new Client({ name: 'playwright-codegen' });
  }

  async connectToMCPSever(serverScriptPath: string) {
    try {
      this.transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();

      this.tools = toolsResult.tools.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        };
      });

      console.log(
        'Connected to server with tools:',
        this.tools.map(({ name }) => name),
      );
    } catch (e) {
      console.log('Failed to connect to MCP server: ', e);
      throw e;
    }
  }

  async generate(context: ScenarioContext) {
    const response = await this.llmClient.sendMessage(context.scenario, context);

    const finalText = [...response.content[0]];
    const toolResults = [];

    for (const toolCall of response.toolCalls) {
      console.log('Tool called:', toolCall.name);
      const toolName = toolCall.name;
      const toolArgs = toolCall.input;

      const result = await this.mcp.callTool({
        name: toolName,
        arguments: toolArgs,
      });
      toolResults.push(result);

      finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`);

      messages.push({
        role: 'user',
        content: result.content as string,
      });

      const followUpResponse = await this.llmClient.processQuery('', messages);
      if (followUpResponse) {
        finalText.push(...followUpResponse.text);
      }
    }

    return finalText.join('\n');
  }

  async cleanup() {
    await this.mcp.close();
  }
}

export class ScenarioContext {
  private readonly _scenario: string;
  private readonly _userInputs: UserInput[];

  constructor(scenario: string, inputs: UserInput[]) {
    this._scenario = scenario;
    this._userInputs = inputs;
  }

  get scenario(): string {
    return this._scenario;
  }

  get userInputs(): UserInput[] {
    return this._userInputs;
  }
}

async function main(
  maxAttempts: number,
  scenario: string,
  baseUrl: string,
  inputs: UserInput[],
  apiKey: string,
  mcpServer: string,
) {
  const codegen = new PlaywrightCodegen(apiKey);
  const context = new ScenarioContext(scenario, inputs);

  try {
    await codegen.connectToMCPSever(mcpServer);
    await codegen.generate(context);
  } finally {
    await codegen.cleanup();
    process.exit(0);
  }
}

program
  .option('--scenario, -s <scenario>', 'scenario to run')
  .option('--url, -u <baseUrl>', 'base URL to start from')
  .option('--input, -i <inputs...>', 'user inputs')
  .option('--max-attempts -m <maxAttempts>', 'maximum number of attempts to reach the final state')
  .option('--api-key, -k <apiKey>', 'API key for the LLM')
  .option('--mcp-server, -mcp <server>', 'MCP server to connect to')
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
