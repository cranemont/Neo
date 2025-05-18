import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { program } from 'commander';
import { LLMClient, LLMContext } from './LLMClient.js';
import { CODEGEN_PROMPT_V1 } from './promp.js';
import * as fs from 'node:fs';
import type { MessageParam, TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs';
import { UserInputContext } from "./InputContext.js";

export class Codegen {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly mcp: Client,
  ) {}

  async generate(context: ScenarioContext) {
    const codegenPrompt = CODEGEN_PROMPT_V1(
      context.scenario,
      context.baseUrl,
      JSON.stringify(context.userInputs.map((input) => input.asPromptContext())),
    );
    const initialMessage = [{ role: 'user', content: codegenPrompt }] as MessageParam[];
    const tools = await this.mcp.listTools();

    const llmContext = new LLMContext(initialMessage, tools.tools);

    let attempts = 0;
    const isSuccess = false;

    while (!isSuccess && attempts < 30) {
      attempts += 1;
      console.log(`Attempt ${attempts} of ${context.scenario}`);

      const response = await this.llmClient.query(llmContext);
      console.log('LLM response:', response);

      if (!response || !response.content) {
        console.error('Failed to get response from LLM');
        continue;
      }

      if (response.stop_reason !== 'tool_use') {
        console.log('Parsed assertion check result:', response);

        break;
      }

      // Extract the tool call if any
      const toolCall = response.content.find((block) => block.type === 'tool_use');
      if (!toolCall) {
        console.log('No tool call in response');

        // Add LLM response to messages for context
        llmContext.addMessage({
          role: 'assistant',
          content: response.content,
        });

        continue;
      }

      console.log(`Tool called: ${toolCall.name}`);
      console.log(`Tool input: ${JSON.stringify(toolCall.input)}`);

      // Process user inputs in the tool input
      let toolInput = JSON.stringify(toolCall.input);
      for (const input of context.userInputs) {
        toolInput = input.replaceIn(toolInput);
      }
      const parsedInput = JSON.parse(toolInput);

      llmContext.addMessage({
        role: 'assistant',
        content: [
          {
            id: toolCall.id,
            type: 'tool_use',
            name: toolCall.name,
            input: toolCall.input,
          },
        ],
      });

      try {
        const toolResult = await this.mcp.callTool({
          name: toolCall.name,
          arguments: parsedInput,
        });

        console.log('Tool result:', toolResult);

        llmContext.addMessage({
          role: 'user',
          content: [
            {
              ...(toolResult as unknown as TextBlockParam),
              type: 'tool_result',
              tool_use_id: toolCall.id,
            },
          ],
        });
      } catch (error) {
        console.error('Error calling tool:', error);
        llmContext.addMessage({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: JSON.stringify({ error: error.message }),
            },
          ],
        });
      }

      fs.writeFileSync(`./messages-${attempts}.json`, JSON.stringify(llmContext.messages, null, 2));
    }
  }
}

export class ScenarioContext {
  constructor(
    readonly scenario: string,
    readonly baseUrl: string,
    readonly userInputs: UserInputContext[],
  ) {}
}

async function main(
  maxAttempts: number,
  scenario: string,
  baseUrl: string,
  inputs: UserInputContext[],
  apiKey: string,
  mcpServer: string,
) {
  let mcpClient: Client;

  try {
    const llmClient = new LLMClient(apiKey);

    mcpClient = new Client({ name: 'playwright-codegen', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [mcpServer],
    });
    await mcpClient.connect(transport);

    const codegen = new Codegen(llmClient, mcpClient);
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
          return UserInputContext.of(key, value, description);
        })
      : [];

    await main(Number(options.maxAttempts), options.scenario, options.url, inputs, options.apiKey, options.mcpServer);
  });

program.parse();
