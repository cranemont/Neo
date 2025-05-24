import type { QueryContext } from './dto/QueryContext.js';
import type { AssistantMessages } from './message/assistant/AssistantMessages.js';

export abstract class LLMClient {
  abstract query(context: QueryContext, retries?: number): Promise<AssistantMessages>;

  protected async retry(context: QueryContext, retriesLeft: number): Promise<AssistantMessages> {
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
