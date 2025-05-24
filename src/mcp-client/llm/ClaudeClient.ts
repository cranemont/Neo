import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/src/resources.js';
import type {
  ContentBlock,
  ContentBlockParam,
  ImageBlockParam,
  MessageParam,
  RedactedThinkingBlock,
  TextBlockParam,
  Tool,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/index';
import type { ThinkingBlock } from '@anthropic-ai/sdk/resources/messages/messages';
import { AssistantMessage } from './message/assistant/AssistantMessage.js';
import { LLMResponseType } from './message/types/LLMResponseType.js';
import type { QueryContext } from './dto/QueryContext.js';
import { ToolUse } from './message/assistant/ToolUse.js';
import { AssistantMessages } from './message/assistant/AssistantMessages.js';
import { LLMClient } from './LLMClient.js';
import type { LLMMessage } from './message/types/LLMMessage.js';
import { UserMessage } from './message/user/UserMessage.js';
import { AssistantMessageType } from './message/types/AssistantMessageType.js';
import { UserMessageType } from './message/types/UserMessageType.js';

export class ClaudeClient extends LLMClient {
  private _client: Anthropic;
  private _model = 'claude-3-7-sonnet-latest';
  private _maxTokens = 2048;
  private _maxRetries = 3;

  constructor(apiKey: string) {
    super();
    this._client = new Anthropic({ apiKey });
  }

  async query(context: QueryContext, retries = this._maxRetries): Promise<AssistantMessages> {
    try {
      const response = await this._client.messages
        .create({
          model: this._model,
          max_tokens: this._maxTokens,
          messages: context.messages.map((message) => this.transformToClauseMessage(message)),
          tools: context.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema as Tool.InputSchema,
          })),
        })
        .then((res) => this.parseResponse(res));

      context.addAssistantMessages(response);

      if (response.type === LLMResponseType.MAX_TOKENS) {
        console.warn('Max tokens reached, consider increasing the limit');
        return this.retry(context, retries - 1);
      }

      return response;
    } catch (error) {
      console.error('Error sending message to LLM:', error);
      return this.retry(context, retries - 1);
    }
  }

  private transformToClauseMessage(message: LLMMessage): MessageParam {
    if (message instanceof UserMessage) {
      return {
        role: 'user',
        content: [this.transformUserMessage(message)],
      };
    }

    return {
      role: 'assistant',
      content: message.messages.map((message) => this.transformAssistantMessage(message)),
    };
  }

  private transformUserMessage(message: UserMessage): ContentBlockParam {
    switch (message.type) {
      case UserMessageType.TEXT:
        return { type: 'text', text: message.text };
      case UserMessageType.TOOL_RESULT:
        return {
          tool_use_id: message.toolResult.id,
          type: 'tool_result',
          content: message.toolResult.content as string | Array<TextBlockParam | ImageBlockParam>,
          is_error: message.toolResult.isError,
        };
      default:
        throw new Error(`Unhandled user message type: ${message.type}`);
    }
  }

  private transformAssistantMessage(message: AssistantMessage): ContentBlockParam {
    switch (message.type) {
      case AssistantMessageType.TEXT:
        return { type: 'text', text: message.text };
      case AssistantMessageType.TOOL_USE:
        return {
          type: 'tool_use',
          id: message.toolUseContext.id,
          name: message.toolUseContext.name,
          input: message.toolUseContext.input,
        };
      case AssistantMessageType.THINKING:
        return { type: 'thinking', thinking: message.thinking.text, signature: message.thinking.signature };
      case AssistantMessageType.REDACTED_THINKING:
        return { type: 'redacted_thinking', data: message.redactedThinking };
      default:
        throw new Error(`Unhandled assistant message type: ${message.type}`);
    }
  }

  private parseResponse(message: Message): AssistantMessages {
    const messages = message.content.map((content) => this.parseContent(content));

    switch (message.stop_reason) {
      case 'end_turn':
        console.log('End of turn reached');
        return AssistantMessages.of(messages, message);
      case 'tool_use':
        console.log('Tool use detected');
        return AssistantMessages.ofToolUse(messages, message);
      case 'max_tokens':
        console.log('Max tokens reached');
        return AssistantMessages.ofMaxTokens(messages, message);
      default:
        throw new Error(`Unhandled stop reason: ${message.stop_reason}, response: ${message}`);
    }
  }

  private parseContent(content: ContentBlock): AssistantMessage {
    switch (content.type) {
      case 'text':
        return AssistantMessage.ofText(content.text);
      case 'tool_use': {
        const tool = content as ToolUseBlock;
        const toolUseContext = new ToolUse(tool.id, tool.input, tool.name);
        return AssistantMessage.ofToolUse(toolUseContext);
      }
      case 'thinking': {
        const thinking = content as ThinkingBlock;
        return AssistantMessage.ofThinking(thinking.thinking, thinking.signature);
      }
      case 'redacted_thinking': {
        const redactedThinking = content as RedactedThinkingBlock;
        return AssistantMessage.ofRedactedThinking(redactedThinking.data);
      }
      default:
        throw new Error(`Unhandled content type: ${(content as { type: string }).type}`);
    }
  }
}
