import Anthropic from '@anthropic-ai/sdk';
import type { Message, MessageParam, Tool } from '@anthropic-ai/sdk/resources/index';
import { LLMResponseType } from '../message/types/LLMResponseType.js';
import type { QueryContext } from '../QueryContext.js';
import type { LLMResponse } from '../message/assistant/LLMResponse.js';
import { LLMClient } from '../LLMClient.js';
import { ClaudeAdapter } from './ClaudeAdapter.js';

export class Claude extends LLMClient<MessageParam[], Message> {
  private _client: Anthropic;
  private _model = 'claude-4-sonnet-20250514'; //'claude-3-7-sonnet-latest';
  private _maxTokens = 4096;
  private _maxRetries = 3;

  constructor(apiKey: string) {
    super(new ClaudeAdapter());
    this._client = new Anthropic({ apiKey });
  }

  async query(context: QueryContext, retries = this._maxRetries): Promise<LLMResponse> {
    try {
      const response = await this._client.messages
        .create({
          model: this._model,
          max_tokens: this._maxTokens,
          messages: this.adapter.toRequest(context.messages),
          tools: context.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema as Tool.InputSchema,
          })),
        })
        .then((res) => this.adapter.toResponse(res));

      context.addLLMResponse(response);

      if (response.type === LLMResponseType.MAX_TOKENS) {
        console.warn('Max tokens reached, consider increasing the limit');
        return this.retry(context, retries - 1);
      }

      return response;
    } catch (error) {
      console.error('Error sending message to LLM:', error);
      return this.retry(context, retries - 1);
    }
  }
}
