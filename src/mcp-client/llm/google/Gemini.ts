import { LLMClient } from '../LLMClient.js';
import type { LLMResponse } from '../message/assistant/LLMResponse.js';
import type { QueryContext } from '../QueryContext.js';
import { GoogleGenAI, type Schema } from "@google/genai";
import { GeminiMessageAdapter } from './Adaptor.js';
import { LLMResponseType } from '../message/types/LLMResponseType.js';

export class Gemini extends LLMClient {
  private _client: GoogleGenAI;
  private _model = 'gemini-2.5-flash-preview-05-20';
  private _maxRetries = 3;
  private _messageAdapter = new GeminiMessageAdapter();

  constructor(readonly apiKey: string) {
    super();
    this._client = new GoogleGenAI({ apiKey });
  }

  async query(context: QueryContext, retries = this._maxRetries): Promise<LLMResponse> {
    try {
      const response = await this._client.models
        .generateContent({
          model: this._model,
          contents: this._messageAdapter.toContentArray(context.messages),
          config: {
            temperature: 0,
            tools: [
              {
                functionDeclarations: context.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.inputSchema as Schema,
                })),
              },
            ],
          },
        })
        .then((res) => this._messageAdapter.toLLMResponse(res));

      console.log(JSON.stringify(response, null, 2));

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
