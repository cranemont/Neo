import { UserMessageType } from '../types/UserMessageType.js';

import type { ToolResult } from './ToolResult.js';

export class UserMessage {
  constructor(
    readonly type: UserMessageType,
    readonly text?: string,
    readonly toolResult?: ToolResult,
  ) {}

  static ofText(text: string): UserMessage {
    return new UserMessage(UserMessageType.TEXT, text, undefined);
  }

  static ofToolResult(toolResultContext: ToolResult): UserMessage {
    return new UserMessage(UserMessageType.TOOL_RESULT, undefined, toolResultContext);
  }

  toString(): string {
    return `UserMessage(type=${this.type}, text=${this.text}, toolResult=${this.toolResult})`;
  }
}
