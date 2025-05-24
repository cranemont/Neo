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
          })) as {
            content: [
              {
                type: 'text';
                text: string;
              },
            ];
          };
          // TODO: mask sensitive data in toolResult.content text

          llmContext.addUserMessage(UserMessage.ofToolResult(ToolResult.success(toolUse, toolResult.content)));
        } catch (error) {
          console.error('Error calling tool:', error);
          llmContext.addUserMessage(
            UserMessage.ofToolResult(ToolResult.error(toolUse, JSON.stringify({ error: error.message }))),
          );
        }
      }

      fs.writeFileSync(`messages3-${attempts}.json`, JSON.stringify(llmContext.messages, null, 2));
    }

    // TODO: extract playwright code from the response with assertions
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
