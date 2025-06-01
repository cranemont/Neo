import type { LLMResponse } from '../message/assistant/LLMResponse.js';
import type { ConversationMessage } from '../message/types/ConversationMessage.js';

/**
 * Generic adapter interface for LLM clients
 * This interface defines the contract for adapters that convert between
 * the application's message format and the LLM provider's format.
 */
export interface MessageAdaptor<RequestType, ResponseType> {
  /**
   * Convert application messages to LLM provider's request format
   * @param messages The application's conversation messages
   * @returns The LLM provider's request format
   */
  toRequest(messages: ConversationMessage[]): RequestType;

  /**
   * Convert LLM provider's response to application's response format
   * @param response The LLM provider's response
   * @returns The application's response format
   */
  toResponse(response: ResponseType): LLMResponse;
}
