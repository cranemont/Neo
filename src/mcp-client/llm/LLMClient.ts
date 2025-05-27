import type { QueryContext } from './QueryContext.js';
import type { LLMResponse } from './message/assistant/LLMResponse.js';
import type { MessageAdaptor } from './interface/MessageAdaptor.js';

/**
 * Abstract base class for LLM clients
 * Provides common functionality for all LLM clients
 */
export abstract class LLMClient<RequestType = unknown, ResponseType = unknown> {
  /**
   * Creates a new LLM client with the specified adapter
   * @param adapter The adapter to use for converting between message formats
   */
  protected constructor(readonly adapter: MessageAdaptor<RequestType, ResponseType>) {}

  /**
   * Queries the LLM with the given context
   * @param context The query context containing messages and tools
   * @param retries The number of retries remaining
   * @returns The LLM response
   */
  abstract query(context: QueryContext, retries?: number): Promise<LLMResponse>;

  /**
   * Retries the query with the given context
   * @param context The query context
   * @param retriesLeft The number of retries remaining
   * @returns The LLM response
   * @throws Error if max retries reached
   */
  protected async retry(context: QueryContext, retriesLeft: number): Promise<LLMResponse> {
    if (retriesLeft <= 0) {
      throw new Error('Max retries reached');
    }

    try {
      return await this.query(context, retriesLeft);
    } catch (error) {
      console.error('Retry failed:', error);
      return this.retry(context, retriesLeft - 1);
    }
  }
}
