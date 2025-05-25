import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CODEGEN_PROMPT_V1 } from '../llm/prompt/prompt.js';
import fs from 'node:fs';
import type { ScenarioContext } from './ScenarioContext.js';
import type { UserInput } from './UserInput.js';
import type { LLMClient } from '../llm/LLMClient.js';
import { QueryContext } from '../llm/dto/QueryContext.js';
import { UserMessage } from '../llm/message/user/UserMessage.js';
import { ToolResult } from '../llm/message/user/ToolResult.js';
import type { LLMMessage } from "../llm/message/types/LLMMessage.js";
import { UserMessageType } from "../llm/message/types/UserMessageType.js";

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
          })) as PlaywrightMcpToolResult;

          toolResult.content = this.maskSensitiveData(toolResult.content, context.userInputs);

          this.removeSnapshotFromPastMessages(llmContext.messages);

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

  private removeSnapshotFromPastMessages(messages: LLMMessage[]): LLMMessage[] {
    return messages.map((message) => {
      if (message instanceof UserMessage && message.type === UserMessageType.TOOL_RESULT) {
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
