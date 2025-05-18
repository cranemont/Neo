import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageParam } from '@anthropic-ai/sdk/src/resources.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export class LLMContext {
  private readonly _messages: MessageParam[];
  private readonly _tools: Tool[];

  constructor(initialMessages: MessageParam[] = [], tools: Tool[] = []) {
    this._messages = [...initialMessages];
    this._tools = tools;
  }

  addMessage(message: MessageParam): void {
    this._messages.push(message);
  }

  get messages(): MessageParam[] {
    return this._messages;
  }

  get tools(): Tool[] {
    return this._tools;
  }
}

export class LLMClient {
  private _client: Anthropic;
  private _model = 'claude-3-7-sonnet-latest';

  constructor(apiKey: string) {
    this._client = new Anthropic({ apiKey });
  }

  async query(context: LLMContext): Promise<Message> {
    try {
      const response: Message = await this._client.messages.create({
        model: this._model,
        max_tokens: 2048,
        messages: context.messages,
        tools: context.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        })),
      });

      return response;
    } catch (error) {
      console.error('Error sending message to LLM:', error);
      throw error;
    }
  }
}
