import type { UserMessage } from '../user/UserMessage.js';
import type { LLMResponse } from '../assistant/LLMResponse.js';

export type MessageHistory = (UserMessage | LLMResponse)[];
