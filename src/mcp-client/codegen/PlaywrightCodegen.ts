import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CODEGEN_PROMPT_V1 } from '../llm/prompt/prompt.js';
import fs from 'node:fs';
import type { ScenarioContext } from './ScenarioContext.js';
import type { UserInput } from './UserInput.js';
import type { LLMClient } from '../llm/LLMClient.js';
import { QueryContext } from '../llm/dto/QueryContext.js';
import { UserMessage } from '../llm/message/user/UserMessage.js';
import { ToolResult } from '../llm/message/user/ToolResult.js';

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

    const llmContext = new QueryContext([UserMessage.ofText(codegenPrompt)], tools.tools);

    let attempts = 0;
    const isSuccess = false;

    while (!isSuccess && attempts < 30) {
      attempts += 1;
      console.log(`Attempt ${attempts} of ${context.scenario}`);

      const response = await this.llmClient.query(llmContext);

      console.log(response);

      if (response.hasToolContext()) {
        const toolUseContext = response.toolUseContext;

        try {
          console.log('Calling tool:', toolUseContext);
          const toolResult = await this.mcp.callTool({
            name: toolUseContext.name,
            arguments: this.unmaskSensitiveData(toolUseContext.input, context.userInputs),
          });
          console.log(toolResult);

          llmContext.addUserMessage(UserMessage.ofToolResult(ToolResult.success(toolUseContext, toolResult.content)));
        } catch (error) {
          console.error('Error calling tool:', error);
          llmContext.addUserMessage(
            UserMessage.ofToolResult(ToolResult.error(toolUseContext, JSON.stringify({ error: error.message }))),
          );
        }
      }

      fs.writeFileSync(`messages3-${attempts}.json`, JSON.stringify(llmContext.messages, null, 2));
    }
  }

  private unmaskSensitiveData(source: unknown, inputs: UserInput[]) {
    let stringifiedSource = JSON.stringify(source);
    for (const input of inputs) {
      stringifiedSource = input.unmask(stringifiedSource);
    }

    console.log('Unmasking sensitive data in source:', stringifiedSource);
    return JSON.parse(stringifiedSource);
  }
}
