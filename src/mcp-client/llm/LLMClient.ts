import type { QueryContext } from './QueryContext.js';
import type { LLMResponse } from './message/assistant/LLMResponse.js';

export abstract class LLMClient {
  abstract query(context: QueryContext, retries?: number): Promise<LLMResponse>;

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
