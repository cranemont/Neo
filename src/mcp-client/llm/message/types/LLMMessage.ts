import type { UserMessage } from "../user/UserMessage.js";
import type { AssistantMessages } from "../assistant/AssistantMessages.js";

export type LLMMessage = UserMessage | AssistantMessages;
