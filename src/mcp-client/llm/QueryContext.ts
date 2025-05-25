import type { UserMessage } from './message/user/UserMessage.js';
import type { LLMResponse } from './message/assistant/LLMResponse.js';
import type { ConversationMessage } from './message/types/ConversationMessage.js';

export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: unknown;
}

export class QueryContext {
  private readonly _messages: ConversationMessage[];
  private readonly _tools: ToolSchema[];

  constructor(initialMessages: ConversationMessage[] = [], tools: ToolSchema[] = []) {
    this._messages = [...initialMessages];
    this._tools = tools;
  }

  addUserMessage(message: UserMessage) {
    this._messages.push(message);
  }

  addLLMResponse(response: LLMResponse) {
    for (const message of response.messages) {
      this._messages.push(message);
    }
  }

  get messages(): ConversationMessage[] {
    return this._messages;
  }

  get tools(): ToolSchema[] {
    return this._tools;
  }
}
