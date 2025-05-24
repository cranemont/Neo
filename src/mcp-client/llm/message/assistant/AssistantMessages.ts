import { LLMResponseType } from '../types/LLMResponseType.js';
import type { AssistantMessage } from './AssistantMessage.js';
import type { ToolUse } from './ToolUse.js';
import { AssistantMessageType } from '../types/AssistantMessageType.js';

export class AssistantMessages {
  constructor(
    private readonly _type: LLMResponseType,
    private readonly _messages: AssistantMessage[],
    private readonly _toolUseContext?: ToolUse,
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

  hasToolContext(): this is AssistantMessages & { get toolUseContext(): ToolUse } {
    return this.type === LLMResponseType.TOOL_USE && this._toolUseContext !== undefined;
  }

  get messages(): AssistantMessage[] {
    return this._messages;
  }

  get type(): LLMResponseType {
    return this._type;
  }

  get toolUseContext(): ToolUse | undefined {
    return this._toolUseContext;
  }
}
