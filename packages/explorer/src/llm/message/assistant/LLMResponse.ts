import { LLMResponseType } from '../types/LLMResponseType.js';
import type { AssistantMessage } from './AssistantMessage.js';
import type { ToolUse } from './ToolUse.js';
import { AssistantMessageType } from '../types/AssistantMessageType.js';
import logger from "../../../logger.js";

export class LLMResponse {
  private constructor(
    readonly id: string,
    private readonly _type: LLMResponseType,
    private readonly _messages: AssistantMessage[],
    private readonly _toolUse?: ToolUse,
    private readonly _originalResponse?: unknown,
  ) {}

  static of(id: string, messages: AssistantMessage[], originalResponse?: unknown): LLMResponse {
    return new LLMResponse(id, LLMResponseType.END_TURN, messages, undefined, originalResponse);
  }

  static ofToolUse(
    id: string,
    messages: AssistantMessage[],
    originalResponse?: unknown,
    toolUseContext?: ToolUse,
  ): LLMResponse {
    if (toolUseContext) {
      return new LLMResponse(id, LLMResponseType.TOOL_USE, messages, toolUseContext, originalResponse);
    }

    const toolUseMessage = messages.find((message) => message.isOfType(AssistantMessageType.TOOL_USE));

    if (!toolUseMessage) {
      throw new Error('No tool use message found in the provided messages.');
    }

    return new LLMResponse(id, LLMResponseType.TOOL_USE, messages, toolUseMessage.toolUse, originalResponse);
  }

  static ofMaxTokens(id: string, messages: AssistantMessage[], originalResponse?: unknown): LLMResponse {
    return new LLMResponse(id, LLMResponseType.MAX_TOKENS, messages, undefined, originalResponse);
  }

  isToolCalled(): this is LLMResponse & { get toolUse(): ToolUse } {
    return this.type === LLMResponseType.TOOL_USE && this._toolUse !== undefined;
  }

  isEndTurn() {
    return this.type === LLMResponseType.END_TURN;
  }

  toString(): string {
    return `AssistantMessages(type=${this.type}, messages=[${this.messages.map((msg) => msg.toString()).join(', ')}], toolUseContext=${this.toolUse})`;
  }

  get messages(): AssistantMessage[] {
    return this._messages;
  }

  get type(): LLMResponseType {
    return this._type;
  }

  get toolUse(): ToolUse | undefined {
    return this._toolUse;
  }

  getSerializedLastMessage() {
    if (this._messages.length === 0) {
      return '';
    }

    const lastMessage = this._messages[this._messages.length - 1];
    if (!lastMessage.isOfType(AssistantMessageType.TEXT)) {
      return '';
    }

    const text = lastMessage.text;

    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch?.[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        logger.error('Failed to parse JSON from last message:', e);
        logger.error(JSON.stringify(lastMessage));
        throw e;
      }
    }

    return JSON.parse(text);
  }
}
