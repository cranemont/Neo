import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources';
import * as readline from 'node:readline/promises';
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { MessageParam } from '@anthropic-ai/sdk/src/resources.js';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
if (!CLAUDE_API_KEY) {
  throw new Error('CLAUDE_API_KEY is not set');
}

class MCPClient {
  private mcp: Client;
  private anthropic: Anthropic;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: CLAUDE_API_KEY,
    });
    this.mcp = new Client({ name: 'mcp-client-cli', version: '1.0.0' });
  }
  // methods will go here

  async connectToServer(serverScriptPath: string) {
    try {
      console.log(serverScriptPath);
      const isJs = serverScriptPath.endsWith('.js');
      const isPy = serverScriptPath.endsWith('.py');
      if (!isJs && !isPy) {
        throw new Error('Server script must be a .js or .py file');
      }
      const command = isPy ? (process.platform === 'win32' ? 'python' : 'python3') : process.execPath;

      this.transport = new StdioClientTransport({
        command,
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      console.log(toolsResult);
      this.tools = toolsResult.tools.map((tool) => {
        console.log(tool.inputSchema);
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

  async processQuery(query: string) {
    const messages: MessageParam[] = [
      {
        role: 'user',
        content: query,
      },
    ];

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages,
      tools: this.tools,
    });

    const finalText = [];
    const toolResults = [];

    for (const content of response.content) {
      if (content.type === 'text') {
        finalText.push(content.text);
      } else if (content.type === 'tool_use') {
        console.log('tool called');
        const toolName = content.name;
        const toolArgs = content.input as { [x: string]: unknown } | undefined;

        const result = await this.mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });
        toolResults.push(result);

        console.log(result, toolResults);
        finalText.push(`[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`);

        messages.push({
          role: 'user',
          content: result.content as string,
        });

        const response = await this.anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages,
        });

        finalText.push(response.content[0].type === 'text' ? response.content[0].text : '');
      }
    }

    return finalText.join('\n');
  }

  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log('\nMCP Client Started!');
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question('\nQuery: ');
        if (message.toLowerCase() === 'quit') {
          break;
        }
        const response = await this.processQuery(message);
        console.log(`\n ${response}`);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

async function client() {
  if (process.argv.length < 3) {
    console.log('Usage: node index.ts <path_to_server_script>');
    return;
  }
  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

await client();
