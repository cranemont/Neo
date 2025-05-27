import { type Content, FinishReason, type GenerateContentResponse, type Part } from '@google/genai';
import type { MessageAdaptor } from '../interface/MessageAdaptor.js';
import {
  type AssistantMessage,
  TextAssistantMessage,
  ToolUseAssistantMessage,
} from '../message/assistant/AssistantMessage.js';
import { AssistantMessageType } from '../message/types/AssistantMessageType.js';
import { BaseUserMessage, type UserMessage } from '../message/user/UserMessage.js';
import { UserMessageType } from '../message/types/UserMessageType.js';
import { LLMResponse } from '../message/assistant/LLMResponse.js';
import { ToolUse } from '../message/assistant/ToolUse.js';
import type { ConversationMessage } from '../message/types/ConversationMessage.js';

export class GeminiAdapter implements MessageAdaptor<Content[], GenerateContentResponse> {
  toResponse(response: GenerateContentResponse): LLMResponse {
    const id = crypto.randomUUID();

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates in response');
    }

    const candidate = response.candidates[0];
    const messages: AssistantMessage[] = [];

    if (response.text) {
      messages.push(new TextAssistantMessage(id, response.text));
    }

    if (response.functionCalls) {
      for (const functionCall of response.functionCalls) {
        messages.push(
          new ToolUseAssistantMessage(
            id,
            new ToolUse(functionCall.id || '', functionCall.args || {}, functionCall.name || ''),
          ),
        );
      }

      console.log('Tool use detected:', response.functionCalls);

      return LLMResponse.ofToolUse(id, messages, response);
    }

    switch (candidate.finishReason) {
      case FinishReason.STOP:
        console.log('End of turn reached');
        return LLMResponse.of(id, messages, response);
      case FinishReason.MAX_TOKENS:
        console.log('Max tokens reached');
        return LLMResponse.ofMaxTokens(id, messages, response);
      default:
        throw new Error(`Unhandled finish reason: ${candidate.finishReason}, response: ${JSON.stringify(response)}`);
    }
  }

  toRequest(messages: ConversationMessage[]): Content[] {
    return messages.map((message) => {
      if (message instanceof BaseUserMessage) {
        return {
          role: 'user',
          parts: [this.userMessageToPart(message)],
        };
      }
      return {
        role: 'model',
        parts: [this.assistantMessageToPart(message)],
      };
    });
  }

  private userMessageToPart(message: UserMessage): Part {
    if (message.isOfType(UserMessageType.TEXT)) {
      return { text: message.text };
    }

    if (message.isOfType(UserMessageType.TOOL_RESULT)) {
      return {
        functionResponse: {
          id: message.toolResult.id === '' ? undefined : message.toolResult.id,
          name: message.toolResult.name,
          response: message.toolResult.isError
            ? { error: message.toolResult.content }
            : { output: message.toolResult.content },
        },
      };
    }

    throw new Error(`Unhandled user message type: ${message}`);
  }

  private assistantMessageToPart(message: AssistantMessage): Part {
    if (message.isOfType(AssistantMessageType.TEXT)) {
      return { text: message.text };
    }

    if (message.isOfType(AssistantMessageType.TOOL_USE)) {
      return {
        functionCall: {
          id: message.toolUse.id === '' ? undefined : message.toolUse.id,
          name: message.toolUse.name,
          args: message.toolUse.input as Record<string, unknown>,
        },
      };
    }

    if (message.isOfType(AssistantMessageType.THINKING)) {
      return {
        text: message.thinking.text,
        thought: true,
      };
    }

    throw new Error(`Unhandled assistant message type: ${message}`);
  }
}
