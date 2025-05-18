import { type LLMClient, LLMContext } from './LLMClient.js';
import { CODEGEN_PROMPT_V1 } from './promp.js';
import fs from 'node:fs';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { MessageParam, TextBlockParam } from '@anthropic-ai/sdk/resources/index';
import type { ScenarioContext } from './scenarioContext.js';

export class Codegen {
  constructor(
    private readonly llmClient: LLMClient,
    private readonly mcp: Client,
  ) {}

  async generate(context: ScenarioContext) {
    const codegenPrompt = CODEGEN_PROMPT_V1(
      context.scenario,
      context.baseUrl,
      JSON.stringify(context.userInputs.map((input) => input.asPromptContext())),
    );
    const initialMessage = [{ role: 'user', content: codegenPrompt }] as MessageParam[];
    const tools = await this.mcp.listTools();

    const llmContext = new LLMContext(initialMessage, tools.tools);

    let attempts = 0;
    const isSuccess = false;

    while (!isSuccess && attempts < 30) {
      attempts += 1;
      console.log(`Attempt ${attempts} of ${context.scenario}`);

      const response = await this.llmClient.query(llmContext);
      console.log('LLM response:', response);

      if (!response || !response.content) {
        console.error('Failed to get response from LLM');
        continue;
      }

      if (response.stop_reason !== 'tool_use') {
        console.log('Parsed assertion check result:', response);

        break;
      }

      // Extract the tool call if any
      const toolCall = response.content.find((block) => block.type === 'tool_use');
      if (!toolCall) {
        console.log('No tool call in response');

        // Add LLM response to messages for context
        llmContext.addMessage({
          role: 'assistant',
          content: response.content,
        });

        continue;
      }

      console.log(`Tool called: ${toolCall.name}`);
      console.log(`Tool input: ${JSON.stringify(toolCall.input)}`);

      // Process user inputs in the tool input
      let toolInput = JSON.stringify(toolCall.input);
      for (const input of context.userInputs) {
        toolInput = input.replaceIn(toolInput);
      }
      const parsedInput = JSON.parse(toolInput);

      llmContext.addMessage({
        role: 'assistant',
        content: [
          {
            id: toolCall.id,
            type: 'tool_use',
            name: toolCall.name,
            input: toolCall.input,
          },
        ],
      });

      try {
        const toolResult = await this.mcp.callTool({
          name: toolCall.name,
          arguments: parsedInput,
        });

        console.log('Tool result:', toolResult);

        llmContext.addMessage({
          role: 'user',
          content: [
            {
              ...(toolResult as unknown as TextBlockParam),
              type: 'tool_result',
              tool_use_id: toolCall.id,
            },
          ],
        });
      } catch (error) {
        console.error('Error calling tool:', error);
        llmContext.addMessage({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: JSON.stringify({ error: error.message }),
            },
          ],
        });
      }

      fs.writeFileSync(`./messages-${attempts}.json`, JSON.stringify(llmContext.messages, null, 2));
    }
  }
}
