import {
  type AssistantMessage,
  RedactedThinkingAssistantMessage,
  TextAssistantMessage,
  ThinkingAssistantMessage,
  ToolUseAssistantMessage,
} from '../message/assistant/AssistantMessage.js';
import type {
  ContentBlock,
  ContentBlockParam,
  ImageBlockParam,
  Message,
  MessageParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/index';
import { AssistantMessageType } from '../message/types/AssistantMessageType.js';
import { BaseUserMessage, type UserMessage } from '../message/user/UserMessage.js';
import { UserMessageType } from '../message/types/UserMessageType.js';
import { LLMResponse } from '../message/assistant/LLMResponse.js';
import { ToolUse } from '../message/assistant/ToolUse.js';
import type { ConversationMessage } from '../message/types/ConversationMessage.js';
import type { MessageAdaptor } from '../interface/MessageAdaptor.js';
import logger from "../../logger.js";

export class ClaudeAdapter implements MessageAdaptor<MessageParam[], Message> {
  toResponse(message: Message): LLMResponse {
    const id = crypto.randomUUID();
    const messages = message.content.map((block) => this.fromContentBlock(id, block));

    switch (message.stop_reason) {
      case 'end_turn':
        logger.info('End of turn reached');
        return LLMResponse.of(id, messages, message);
      case 'tool_use':
        logger.info('Tool use detected');
        return LLMResponse.ofToolUse(id, messages, message);
      case 'max_tokens':
        logger.info('Max tokens reached');
        return LLMResponse.ofMaxTokens(id, messages, message);
      default:
        throw new Error(`Unhandled stop reason: ${message.stop_reason}, response: ${message}`);
    }
  }

  private fromContentBlock(id: string, block: ContentBlock): AssistantMessage {
    switch (block.type) {
      case 'text':
        return new TextAssistantMessage(id, block.text);
      case 'tool_use': {
        return new ToolUseAssistantMessage(id, new ToolUse(block.id, block.input, block.name));
      }
      case 'thinking': {
        return new ThinkingAssistantMessage(id, {
          text: block.thinking,
          signature: block.signature,
        });
      }
      case 'redacted_thinking': {
        return new RedactedThinkingAssistantMessage(id, block.data);
      }
      default:
        throw new Error(`Unhandled content type: ${block}`);
    }
  }

  toRequest(messages: ConversationMessage[]): MessageParam[] {
    return messages.reduce((messageParam: MessageParam[], message) => {
      if (message instanceof BaseUserMessage) {
        messageParam.push({
          role: 'user',
          content: [this.userMessageToContentBlockParam(message)],
        });
      } else {
        const lastMessage = messageParam[messageParam.length - 1];

        if (lastMessage && lastMessage.role === 'assistant' && Array.isArray(lastMessage.content)) {
          lastMessage.content.push(this.assistantMessageToContentBlockParam(message));
        } else {
          messageParam.push({
            role: 'assistant',
            content: [this.assistantMessageToContentBlockParam(message)],
          });
        }
      }
      return messageParam;
    }, []);
  }

  private userMessageToContentBlockParam(message: UserMessage): ContentBlockParam {
    if (message.isOfType(UserMessageType.TEXT)) {
      return { type: 'text', text: message.text };
    }

    if (message.isOfType(UserMessageType.TOOL_RESULT)) {
      return {
        type: 'tool_result',
        tool_use_id: message.toolResult.id,
        content: message.toolResult.content as Array<TextBlockParam | ImageBlockParam>,
        is_error: message.toolResult.isError,
      };
    }

    throw new Error(`Unhandled user message type: ${message}`);
  }

  private assistantMessageToContentBlockParam(message: AssistantMessage): ContentBlockParam {
    if (message.isOfType(AssistantMessageType.TEXT)) {
      return { type: 'text', text: message.text };
    }

    if (message.isOfType(AssistantMessageType.TOOL_USE)) {
      return {
        type: 'tool_use',
        id: message.toolUse.id,
        name: message.toolUse.name,
        input: message.toolUse.input,
      };
    }

    if (message.isOfType(AssistantMessageType.THINKING)) {
      return {
        type: 'thinking',
        thinking: message.thinking.text,
        signature: message.thinking.signature,
      };
    }

    if (message.isOfType(AssistantMessageType.REDACTED_THINKING)) {
      return { type: 'redacted_thinking', data: message.redactedThinking };
    }

    throw new Error(`Unhandled assistant message type: ${message}`);
  }
}
