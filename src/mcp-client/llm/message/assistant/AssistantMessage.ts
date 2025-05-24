import { AssistantMessageType } from '../types/AssistantMessageType.js';
import type { ToolUse } from './ToolUse.js';
import type { ThinkingBlock } from '../types/ThinkingBlock.js';

export class AssistantMessage {
  constructor(
    readonly type: AssistantMessageType,
    readonly text?: string,
    readonly toolUseContext?: ToolUse,
    readonly thinking?: ThinkingBlock,
    readonly redactedThinking?: string,
  ) {}

  static ofText(text: string): AssistantMessage {
    return new AssistantMessage(AssistantMessageType.TEXT, text, undefined);
  }

  static ofToolUse(toolUseContext: ToolUse): AssistantMessage {
    return new AssistantMessage(AssistantMessageType.TOOL_USE, undefined, toolUseContext);
  }

  static ofThinking(text: string, signature: string): AssistantMessage {
    return new AssistantMessage(AssistantMessageType.THINKING, undefined, undefined, { text, signature });
  }

  static ofRedactedThinking(data: string): AssistantMessage {
    return new AssistantMessage(AssistantMessageType.REDACTED_THINKING, undefined, undefined, undefined, data);
  }

  checkType(type: AssistantMessageType): this is AssistantMessage &
    (
      | {
          text: string;
        }
      | { toolUseContext: ToolUse }
      | { thinking: ThinkingBlock }
      | { redactedThinking: string }
    ) {
    switch (type) {
      case AssistantMessageType.TEXT:
        return !!this.text;
      case AssistantMessageType.TOOL_USE:
        return !!this.toolUseContext;
      case AssistantMessageType.THINKING:
        return !!this.thinking;
      case AssistantMessageType.REDACTED_THINKING:
        return !!this.redactedThinking;
    }
  }
}
