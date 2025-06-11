import type { LLMClient } from '../llm/LLMClient.js';
import { QueryContext } from '../llm/QueryContext.js';
import type { ConversationMessage } from '../llm/message/types/ConversationMessage.js';
import { UserMessageType } from '../llm/message/types/UserMessageType.js';
import { ToolResult } from '../llm/message/user/ToolResult.js';
import { BaseUserMessage, TextUserMessage, ToolResultUserMessage } from '../llm/message/user/UserMessage.js';
import { AssertionPrompt } from '../llm/prompt/assertion.js';
import { CODEGEN_PROMPT_V1 } from '../llm/prompt/explorer.js';
import type { ExecutionContext } from './ExecutionContext.js';
import type { UserInput } from './UserInput.js';
import type { MCPClient } from '../mcp/MCPClient.js';
import { PlaywrightToolResultSchema } from '../mcp/playwright-mcp/ResponseSchema.js';
import { ExecutionResult } from './ExecutionResult.js';
import logger from '../logger.js';

export class PlaywrightCodegen {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly mcpClient: MCPClient,
  ) {}

  async generate(context: ExecutionContext, maxAttempts: number): Promise<ExecutionResult> {
    try {
      const codegenPrompt = CODEGEN_PROMPT_V1(
        context.scenario,
        context.baseUrl,
        JSON.stringify(context.userInputs.map((input) => input.keyWithDescription)),
        context.domainContext.join('\n'),
      );

      const tools = await this.mcpClient.listTools();
      const queryContext = new QueryContext([new TextUserMessage(codegenPrompt)], tools);

      let attempts = 0;
      const isSuccess = false;

      while (!isSuccess && attempts < maxAttempts) {
        attempts += 1;
        logger.info(`Attempt ${attempts} of ${context.scenario}`);

        const response = await this.llmClient.query(queryContext);

        if (response.isEndTurn()) {
          logger.info('End of turn detected, stopping attempts.');

          break;
        }

        if (response.isToolCalled()) {
          const toolUse = response.toolUse;

          try {
            logger.info(`Calling tool: ${JSON.stringify(toolUse)}`);
            const toolResult = await this.mcpClient.callTool(
              toolUse.name,
              this.unmaskSensitiveData(toolUse.input as Record<string, unknown>, context.userInputs),
              PlaywrightToolResultSchema,
            );

            toolResult.content = this.maskSensitiveData(toolResult.content, context.userInputs);

            this.removeSnapshotFromPastMessages(queryContext.messages);

            queryContext.addUserMessage(new ToolResultUserMessage(ToolResult.success(toolUse, toolResult.content)));
          } catch (error) {
            logger.error('Error calling tool:', error);
            queryContext.addUserMessage(
              new ToolResultUserMessage(ToolResult.error(toolUse, JSON.stringify({ error: (error as Error).message }))),
            );
          }
        }
      }

      const lastSnapshot = this.extractLastSnapshotFromMessages(queryContext.messages.toReversed());

      const assertionResult = await this.createAssertion(queryContext.copy(), context.scenario);
      const maskedCode = this.extractCodeFromMessages(queryContext.messages);
      const code = this.unmaskSensitiveData(maskedCode, context.userInputs);

      if (assertionResult.isFulfilled) {
        return ExecutionResult.ofSuccess(
          context.id,
          context,
          assertionResult.explanation,
          code?.split('\n') || [],
          assertionResult.assertion,
          lastSnapshot,
        );
      }

      return ExecutionResult.ofFailure(
        context.id,
        context,
        assertionResult.explanation,
        code?.split('\n') || [],
        assertionResult.assertion,
        lastSnapshot,
      );
    } catch (e) {
      logger.error('Error during Playwright code generation:', e);
      return ExecutionResult.ofError(context.id, context, `Code generation failed: ${(e as Error).message}`);
    }
  }

  private async createAssertion(context: QueryContext, scenario: string) {
    context.addUserMessage(new TextUserMessage(AssertionPrompt.generate(scenario)));

    const response = await this.llmClient.query(context);
    return AssertionPrompt.parseResponse(response.getSerializedLastMessage());
  }

  private extractCodeFromMessages(messages: ConversationMessage[]): string {
    return messages
      .filter((message) => message instanceof BaseUserMessage && message.isOfType(UserMessageType.TOOL_RESULT))
      .map((message) => {
        const toolResult = message.toolResult as { content: { text: string }[] };
        const code = toolResult.content[0].text.match(/```js\n([\s\S]*?)\n```/);
        if (code?.[1]) {
          return code[1].trim();
        }
        return '';
      })
      .join('\n');
  }

  private removeSnapshotFromPastMessages(messages: ConversationMessage[]): ConversationMessage[] {
    return messages.map((message) => {
      if (message instanceof BaseUserMessage && message.isOfType(UserMessageType.TOOL_RESULT)) {
        const originalToolResult = message.toolResult as { content: { text: string }[] };

        originalToolResult.content[0].text = originalToolResult.content[0].text.replace(
          /- Page Snapshot\s*\n```yaml\n[\s\S]*?\n```/g,
          '- Page Snapshot: [REMOVED]',
        );
      }
      return message;
    });
  }

  private extractLastSnapshotFromMessages(messages: ConversationMessage[]): string | undefined {
    for (const message of messages) {
      if (message instanceof BaseUserMessage && message.isOfType(UserMessageType.TOOL_RESULT)) {
        const toolResult = message.toolResult as { content: { text: string }[] };
        const snapshotMatch = toolResult.content[0].text.match(/- Page Snapshot\s*\n```yaml\n([\s\S]*?)\n```/);
        if (snapshotMatch?.[1]) {
          return snapshotMatch[1].trim();
        }
      }
    }
    return undefined;
  }

  private maskSensitiveData<T>(source: T, inputs: UserInput[]): T {
    return this.processSensitiveData(source, inputs, 'mask');
  }

  private unmaskSensitiveData<T>(source: T, inputs: UserInput[]): T {
    return this.processSensitiveData(source, inputs, 'unmask');
  }

  private processSensitiveData(source: unknown, inputs: UserInput[], operation: 'mask' | 'unmask') {
    if (source === null || source === undefined) {
      return source;
    }

    if (typeof source === 'string') {
      let result = source;
      for (const input of inputs) {
        result = operation === 'mask' ? input.mask(result) : input.unmask(result);
      }
      return result;
    }

    if (typeof source === 'number' || typeof source === 'boolean') {
      return source;
    }

    if (Array.isArray(source)) {
      return source.map((item) => this.processSensitiveData(item, inputs, operation));
    }

    if (typeof source === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(source)) {
        const processedKey = this.processSensitiveData(key, inputs, operation);
        result[processedKey] = this.processSensitiveData(value, inputs, operation);
      }
      return result;
    }

    return source;
  }
}
