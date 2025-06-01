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

export class PlaywrightCodegen {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly mcpClient: MCPClient,
  ) {}

  async generate(context: ExecutionContext) {
    const codegenPrompt = CODEGEN_PROMPT_V1(
      context.scenario,
      context.baseUrl,
      JSON.stringify(context.userInputs.map((input) => input.keyWithDescription)),
      JSON.stringify(context.domainContext),
    );

    const tools = await this.mcpClient.listTools();
    const queryContext = new QueryContext([new TextUserMessage(codegenPrompt)], tools);

    let attempts = 0;
    const isSuccess = false;

    while (!isSuccess && attempts < 30) {
      attempts += 1;
      console.log(`Attempt ${attempts} of ${context.scenario}`);

      const response = await this.llmClient.query(queryContext);

      if (response.isEndTurn()) {
        console.log('End of turn detected, stopping attempts.');
        // TODO: check if the response is valid and contains code

        break;
      }

      if (response.isToolCalled()) {
        const toolUse = response.toolUse;

        try {
          console.log('Calling tool:', toolUse);
          const toolResult = await this.mcpClient.callTool(
            toolUse.name,
            this.unmaskSensitiveData(toolUse.input, context.userInputs),
            PlaywrightToolResultSchema,
          );

          toolResult.content = this.maskSensitiveData(toolResult.content, context.userInputs);

          this.removeSnapshotFromPastMessages(queryContext.messages);

          queryContext.addUserMessage(new ToolResultUserMessage(ToolResult.success(toolUse, toolResult.content)));
        } catch (error) {
          console.error('Error calling tool:', error);
          queryContext.addUserMessage(
            new ToolResultUserMessage(ToolResult.error(toolUse, JSON.stringify({ error: (error as Error).message }))),
          );
        }
      }

      // fs.writeFileSync(`gemini-${attempts}.json`, JSON.stringify(queryContext.messages, null, 2));
    }

    const assertionResult = await this.createAssertion(queryContext.copy(), context.scenario);
    const maskedCode = this.extractCodeFromMessages(queryContext.messages);
    const code = this.unmaskSensitiveData(maskedCode, context.userInputs);

    if (assertionResult.isFulfilled) {
      return ExecutionResult.ofSuccess(
        context.id,
        context,
        assertionResult.explanation,
        code,
        assertionResult.assertion,
      );
    }

    return ExecutionResult.ofFailure(context.id, context, assertionResult.explanation, code, assertionResult.assertion);
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

  private maskSensitiveData(source: unknown, inputs: UserInput[]) {
    let stringifiedSource = JSON.stringify(source);
    console.log(stringifiedSource.slice(0, 200));
    for (const input of inputs) {
      stringifiedSource = input.mask(stringifiedSource);
    }

    return JSON.parse(stringifiedSource);
  }

  private unmaskSensitiveData(source: unknown, inputs: UserInput[]) {
    let stringifiedSource = JSON.stringify(source);
    for (const input of inputs) {
      stringifiedSource = input.unmask(stringifiedSource);
    }

    return JSON.parse(stringifiedSource);
  }
}
