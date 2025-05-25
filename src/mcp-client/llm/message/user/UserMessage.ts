import { UserMessageType } from '../types/UserMessageType.js';
import type { ToolResult } from './ToolResult.js';

type MessageTypeMap = {
  [UserMessageType.TEXT]: TextUserMessage;
  [UserMessageType.TOOL_RESULT]: ToolResultUserMessage;
};

export abstract class BaseUserMessage {
  protected constructor(readonly type: UserMessageType) {}

  isOfType<T extends UserMessageType>(type: T): this is MessageTypeMap[T] {
    return this.type === type;
  }
}

export class TextUserMessage extends BaseUserMessage {
  constructor(readonly text: string) {
    super(UserMessageType.TEXT);
  }
}

export class ToolResultUserMessage extends BaseUserMessage {
  constructor(readonly toolResult: ToolResult) {
    super(UserMessageType.TOOL_RESULT);
  }
}

export type UserMessage = TextUserMessage | ToolResultUserMessage;
