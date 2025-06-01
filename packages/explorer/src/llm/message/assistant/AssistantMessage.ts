import { AssistantMessageType } from '../types/AssistantMessageType.js';
import type { ToolUse } from './ToolUse.js';

type MessageTypeMap = {
  [AssistantMessageType.TEXT]: TextAssistantMessage;
  [AssistantMessageType.TOOL_USE]: ToolUseAssistantMessage;
  [AssistantMessageType.THINKING]: ThinkingAssistantMessage;
  [AssistantMessageType.REDACTED_THINKING]: RedactedThinkingAssistantMessage;
};

export abstract class BaseAssistantMessage {
  protected constructor(
    readonly id: string,
    readonly type: AssistantMessageType,
  ) {}

  isOfType<T extends AssistantMessageType>(type: T): this is MessageTypeMap[T] {
    return this.type === type;
  }
}

export class TextAssistantMessage extends BaseAssistantMessage {
  constructor(
    readonly id: string,
    readonly text: string,
  ) {
    super(id, AssistantMessageType.TEXT);
  }
}

export class ToolUseAssistantMessage extends BaseAssistantMessage {
  constructor(
    readonly id: string,
    readonly toolUse: ToolUse,
  ) {
    super(id, AssistantMessageType.TOOL_USE);
  }
}

export class ThinkingAssistantMessage extends BaseAssistantMessage {
  constructor(
    readonly id: string,
    readonly thinking: {
      text: string;
      signature: string;
    },
  ) {
    super(id, AssistantMessageType.THINKING);
  }
}

export class RedactedThinkingAssistantMessage extends BaseAssistantMessage {
  constructor(
    readonly id: string,
    readonly redactedThinking: string,
  ) {
    super(id, AssistantMessageType.REDACTED_THINKING);
  }
}

export type AssistantMessage =
  | TextAssistantMessage
  | ToolUseAssistantMessage
  | ThinkingAssistantMessage
  | RedactedThinkingAssistantMessage;
