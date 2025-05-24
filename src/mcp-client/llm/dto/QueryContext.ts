import type { AssistantMessage } from '../message/assistant/AssistantMessage.js';
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index';
import { MessageRole } from '../message/types/MessageRole.js';
import type { UserMessage } from '../message/user/UserMessage.js';
import type { LLMMessage } from '../message/types/LLMMessage.js';
import type { AssistantMessages } from "../message/assistant/AssistantMessages.js";

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: unknown;
}

export class ClaudeMessage {
  constructor(readonly content: ContentBlockParam[]) {}

  static ofUser(message: UserMessage) {
    return new ClaudeMessage([{ type: 'text', text: message.text }]);
  }

  static ofAssistant(message: AssistantMessage) {}

  toClaude() {
    return {
      role: MessageRole.ASSISTANT,
      content: this.content,
    };
  }
}

export class QueryContext {
  private readonly _messages: LLMMessage[];
  private readonly _tools: ToolSchema[];

  constructor(initialMessages: LLMMessage[] = [], tools: ToolSchema[] = []) {
    this._messages = [...initialMessages];
    this._tools = tools;
  }

  addUserMessage(message: UserMessage) {
    this._messages.push(message);
  }

  addAssistantMessages(messages: AssistantMessages) {
    this._messages.push(messages);
  }

  get messages(): LLMMessage[] {
    return this._messages;
  }

  get tools(): ToolSchema[] {
    return this._tools;
  }
}
