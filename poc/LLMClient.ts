import * as process from 'node:process';
import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages/messages';
import type { MessageParam } from '@anthropic-ai/sdk/src/resources/messages/messages.js';
import type { Tool } from './mcp/tools/tool.js';

export class LLMClient {
  private readonly _llm: Anthropic;

  constructor(apiKey: string) {
    this._llm = new Anthropic({
      apiKey,
    });
  }

  static createClaude() {
    const API_KEY = process.env.CLAUDE_API_KEY;
    if (!API_KEY) {
      throw new Error('No Claude API key provided');
    }

    return new LLMClient(API_KEY);
  }

  async messageWithTools(messages: MessageParam[], tools: Tool[]) {
    try {
      const result = await this._llm.messages.create({
        max_tokens: 2048,
        messages: messages,
        tools: tools.map((tool) => {
          return {
            name: tool.schema.name,
            description: tool.schema.description,
            input_schema: tool.schema.inputSchema as any,
          };
        }),
        model: 'claude-3-7-sonnet-latest',
      });
      console.log(result);

      return result;
    } catch (e) {
      console.error(e);
    }
  }

  async messageWithImage(prompt: string, base64Image: string) {
    try {
      const result = await this._llm.messages.create({
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
          {
            role: 'user',
            content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64Image } }],
          },
        ],
        model: 'claude-3-7-sonnet-latest',
      });

      return result.content[0] as TextBlock;
    } catch (e) {
      console.error(e);
    }
  }

  async message(prompt: string, system?: string) {
    try {
      const result = await this._llm.messages.create({
        max_tokens: 2048,
        system: system,
        temperature: 0.5,
        tools: [],
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'claude-3-7-sonnet-latest',
      });

      return result.content[0] as TextBlock;
    } catch (e) {
      console.error(e);
    }
  }

  parseJson(json: string) {
    const match = json.match(/<json>([\s\S]*?)<\/json>/);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error('코드 블록 내용이 유효한 JSON이 아닙니다:', e);

        throw e;
      }
    }

    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('전체 응답이 유효한 JSON이 아닙니다:', e);

      throw e;
    }
  }
}
