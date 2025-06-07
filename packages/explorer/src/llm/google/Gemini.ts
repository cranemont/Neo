import { LLMClient } from '../LLMClient.js';
import type { LLMResponse } from '../message/assistant/LLMResponse.js';
import type { QueryContext } from '../QueryContext.js';
import { type Content, type GenerateContentResponse, GoogleGenAI, type Schema, Type } from '@google/genai';
import { LLMResponseType } from '../message/types/LLMResponseType.js';
import { GeminiAdapter } from './GeminiAdapter.js';
import { z } from 'zod';
import logger from '../../logger.js';

export class Gemini extends LLMClient<Content[], GenerateContentResponse> {
  private _client: GoogleGenAI;
  private _maxRetries = 5;

  constructor(
    readonly apiKey: string,
    readonly model = 'gemini-2.5-flash-preview-05-20',
  ) {
    super(new GeminiAdapter());
    this._client = new GoogleGenAI({ apiKey });
  }

  async query(context: QueryContext, responseSchema?: z.ZodType, retries = this._maxRetries): Promise<LLMResponse> {
    try {
      logger.info('calling gemini...');
      const response = await this._client.models
        .generateContent({
          model: this.model,
          contents: this.adapter.toRequest(context.messages),
          config: {
            httpOptions: {
              timeout: 60_000, // 60 seconds timeout
            },
            responseMimeType: responseSchema ? 'application/json' : 'text/plain',
            responseSchema: responseSchema
              ? {
                  type: Type.OBJECT,
                  properties: responseSchema instanceof z.ZodObject ? responseSchema.shape : {},
                }
              : {},
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
        .then((res) => this.adapter.toResponse(res));

      context.addLLMResponse(response);

      if (response.type === LLMResponseType.MAX_TOKENS) {
        logger.warn('Max tokens reached, consider increasing the limit');
        return this.retry(context, retries - 1);
      }

      return response;
    } catch (error) {
      logger.error('Error sending message to LLM:', error);
      return this.retry(context, retries - 1);
    }
  }
}
