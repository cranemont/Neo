import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CODEGEN_PROMPT_V1 } from '../llm/prompt/explorer.js';
import fs from 'node:fs';
import type { UserInput } from './UserInput.js';
import type { LLMClient } from '../llm/LLMClient.js';
import { QueryContext } from '../llm/QueryContext.js';
import { BaseUserMessage, TextUserMessage, ToolResultUserMessage } from '../llm/message/user/UserMessage.js';
import { ToolResult } from '../llm/message/user/ToolResult.js';
import type { ConversationMessage } from '../llm/message/types/ConversationMessage.js';
import { UserMessageType } from '../llm/message/types/UserMessageType.js';
import { ASSERTION_PROMPT_V1 } from '../llm/prompt/assertion.js';
import { CODE_EXTRACTION_PROMPT_V1 } from "../llm/prompt/codegen.js";
import type { ExecutionContext } from "./ExecutionContext.js";

type PlaywrightMcpToolResult = {
  content: [
    {
      type: 'text';
      text: string;
    },
  ];
};

export class PlaywrightCodegen {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly mcp: Client,
  ) {}

  async generate(context: ExecutionContext) {
    const codegenPrompt = CODEGEN_PROMPT_V1(
      context.scenario,
      context.baseUrl,
      JSON.stringify(context.userInputs.map((input) => input.keyWithDescription)),
      JSON.stringify(context.domainContext),
    );

    const tools = await this.mcp.listTools();

    const queryContext = new QueryContext([new TextUserMessage(codegenPrompt)], tools.tools);

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
          const toolResult = (await this.mcp.callTool({
            name: toolUse.name,
            arguments: this.unmaskSensitiveData(toolUse.input, context.userInputs),
          })) as PlaywrightMcpToolResult;

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
    fs.writeFileSync('assertion.json', JSON.stringify(assertionResult.messages, null, 2));
    // TODO: assertion 확인 후 실패인 경우 에러처리

    const maskedCode = this.extractCodeFromMessages(queryContext.messages);
    const extractedCode = await this.extractCode(queryContext.copy(), context.scenario, maskedCode);
    fs.writeFileSync('extracted-code.json', JSON.stringify(extractedCode.messages, null, 2));

    const code = this.unmaskSensitiveData(maskedCode, context.userInputs);
    fs.writeFileSync(`test-${context.scenario}.ts`, this.makeCodeSnippet(code, context.scenario));
  }

  private async createAssertion(context: QueryContext, scenario: string) {
    context.addUserMessage(new TextUserMessage(ASSERTION_PROMPT_V1(scenario)));

    return await this.llmClient.query(context);
  }

  private async extractCode(context: QueryContext, scenario: string, code: string) {
    context.addUserMessage(new TextUserMessage(CODE_EXTRACTION_PROMPT_V1(scenario, code)));

    return await this.llmClient.query(context);
  }

  private makeCodeSnippet(code: string, scenario: string): string {
    return `import { test } from '@playwright/test'; \n\ntest('${scenario}', async ({ page }) => {\n${code}\n});`;
  }

  private extractCodeFromMessages(messages: ConversationMessage[]): string {
    return messages
      .filter((message) => message instanceof BaseUserMessage && message.isOfType(UserMessageType.TOOL_RESULT))
      .map((message) => {
        const toolResult = message.toolResult as unknown as PlaywrightMcpToolResult;
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
        const originalToolResult = message.toolResult as unknown as PlaywrightMcpToolResult;

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
