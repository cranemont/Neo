import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CODEGEN_PROMPT_V1 } from '../llm/prompt/explorer.js';
import fs from 'node:fs';
import type { ScenarioContext } from './ScenarioContext.js';
import type { UserInput } from './UserInput.js';
import type { LLMClient } from '../llm/LLMClient.js';
import { QueryContext } from '../llm/QueryContext.js';
import { BaseUserMessage, TextUserMessage, ToolResultUserMessage } from '../llm/message/user/UserMessage.js';
import { ToolResult } from '../llm/message/user/ToolResult.js';
import type { ConversationMessage } from '../llm/message/types/ConversationMessage.js';
import { UserMessageType } from '../llm/message/types/UserMessageType.js';
import { ASSERTION_PROMPT_V1 } from '../llm/prompt/assertion.js';
import { CODE_EXTRACTION_PROMPT_V1 } from "../llm/prompt/codegen.js";

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

  async generate(context: ScenarioContext) {
    const codegenPrompt = CODEGEN_PROMPT_V1(
      context.scenario,
      context.baseUrl,
      JSON.stringify(context.userInputContext),
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

      fs.writeFileSync(`gemini-${attempts}.json`, JSON.stringify(queryContext.messages, null, 2));
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

fs.writeFileSync(
  'playwright-codegen.json',
  JSON.parse(
    "{\n  \"code\": '''\nimport { test, expect } from '@playwright/test';\n\ntest('로그인한 사용자의 경우 대시보드 페이지에서 추천 채용 공고를 확인할 수 있다', async ({ page }) => {\n  await page.goto('https://www.inflearn.com');\n  await page.keyboard.press('Escape');\n  await page.getByRole('button', { name: '로그인' }).click();\n  await page.getByRole('textbox', { name: '이메일' }).fill('__EMAIL__');\n  await page.getByRole('textbox', { name: '비밀번호' }).fill('__PASSWORD__');\n  await page.getByRole('button', { name: '로그인', exact: true }).click();\n  await page.getByRole('button', { name: '다음으로' }).click();\n  await page.getByRole('button', { name: '다음에 할게요' }).click();\n  await page.getByRole('link', { name: '대시보드' }).click();\n\n  // Verify the presence of recommended job postings on the dashboard\n  await expect(page.getByText('추천 채용')).toBeVisible();\n  await expect(page.getByText('Full-Stack Enginner (풀스택 개발자)')).toBeVisible();\n});\n''',\n  \"explanation\": \"The provided Playwright code directly reflects the successful sequence of actions taken to fulfill the test scenario. \\n\\nOptimizations made:\\n1. Removed the internal `browser_snapshot` call as it's a tool-specific action and not part of the Playwright test script.\\n2. Added an assertion `await expect(page.getByText('추천 채용')).toBeVisible();` and `await expect(page.getByText('Full-Stack Enginner (풀스택 개발자)')).toBeVisible();` to verify that '추천 채용' (Recommended Jobs) and a sample job posting are visible on the dashboard, confirming the test scenario's success. This ensures the test explicitly checks for the desired outcome.\"\n}",
  ),
);
