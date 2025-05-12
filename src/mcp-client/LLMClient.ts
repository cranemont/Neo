import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageParam } from '@anthropic-ai/sdk/src/resources.js';

export class LLMContext {
  private readonly _messages: MessageParam[];
  private readonly _model: string;
  private readonly _maxTokens: number;

  constructor(model: string, maxTokens = 2048) {
    this._messages = [];
    this._model = model;
    this._maxTokens = maxTokens;
  }

  addMessage(message: MessageParam): void {
    this._messages.push(message);
  }

  get messages(): MessageParam[] {
    return this._messages;
  }

  get model(): string {
    return this._model;
  }
}

export class LLMClient {
  private _client: Anthropic;

  constructor(apiKey: string) {
    this._client = new Anthropic({ apiKey });
  }

  async sendMessage(message: string, context: LLMContext): Promise<MessageParam> {
    try {
      const response: Message = await this._client.messages.create({
        model: context.model,
        max_tokens: 2048,
        messages: [...context.messages, { role: 'user', content: message }],
      });

      context.addMessage({ role: 'user', content: message });

      return response;
    } catch (error) {
      console.error('Error sending message to LLM:', error);
      throw error;
    }
  }
}
