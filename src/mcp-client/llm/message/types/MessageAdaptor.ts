import type { LLMResponse } from "../assistant/LLMResponse.js";
import type { ConversationMessage } from "./ConversationMessage.js";

export interface MessageAdaptor<RequestType, ResponseType> {
  toResponse(response: ResponseType): LLMResponse;

  toRequest(messages: ConversationMessage[]): RequestType[];
}
