import type { UserMessage } from './message/user/UserMessage.js';
import type { LLMResponse } from './message/assistant/LLMResponse.js';
import type { ConversationMessage } from './message/types/ConversationMessage.js';
import type { ToolSchemaType } from "../mcp/MCPClient.js";

export class QueryContext {
  private readonly _messages: ConversationMessage[];
  private readonly _tools: ToolSchemaType[];

  constructor(initialMessages: ConversationMessage[] = [], tools: ToolSchemaType[] = []) {
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

  copy(): QueryContext {
    return new QueryContext([...this._messages], [...this._tools]);
  }

  get messages(): ConversationMessage[] {
    return this._messages;
  }

  get tools(): ToolSchemaType[] {
    return this._tools;
  }
}
