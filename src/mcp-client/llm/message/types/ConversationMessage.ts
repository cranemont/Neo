import type { UserMessage } from '../user/UserMessage.js';
import type { AssistantMessage } from '../assistant/AssistantMessage.js';

export type ConversationMessage = UserMessage | AssistantMessage;
