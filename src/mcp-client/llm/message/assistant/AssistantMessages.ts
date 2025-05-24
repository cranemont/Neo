import { LLMResponseType } from '../types/LLMResponseType.js';
import type { AssistantMessage } from './AssistantMessage.js';
import type { ToolUse } from './ToolUse.js';
import { AssistantMessageType } from '../types/AssistantMessageType.js';

export class AssistantMessages {
  constructor(
    private readonly _type: LLMResponseType,
    private readonly _messages: AssistantMessage[],
    private readonly _toolUse?: ToolUse,
    private readonly _originalResponse?: unknown,
  ) {}

  static of(messages: AssistantMessage[], originalResponse?: unknown): AssistantMessages {
    return new AssistantMessages(LLMResponseType.END_TURN, messages, undefined, originalResponse);
  }

  static ofToolUse(
    messages: AssistantMessage[],
    originalResponse?: unknown,
    toolUseContext?: ToolUse,
  ): AssistantMessages {
    if (toolUseContext) {
      return new AssistantMessages(LLMResponseType.TOOL_USE, messages, toolUseContext, originalResponse);
    }

    const toolUseMessage = messages.find((message) => message.type === AssistantMessageType.TOOL_USE);
    return new AssistantMessages(LLMResponseType.TOOL_USE, messages, toolUseMessage.toolUseContext, originalResponse);
  }

  static ofMaxTokens(messages: AssistantMessage[], originalResponse?: unknown): AssistantMessages {
    return new AssistantMessages(LLMResponseType.MAX_TOKENS, messages, undefined, originalResponse);
  }

  isToolCalled(): this is AssistantMessages & { get toolUseContext(): ToolUse } {
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
}
