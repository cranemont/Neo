import * as fs from 'node:fs';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages/messages';
import type { MessageParam, TextBlockParam } from '@anthropic-ai/sdk/src/resources/messages/messages';
import { program } from 'commander';
import type { LaunchOptions, Page } from 'playwright';
import { LLMClient } from './LLMClient';
import { Context } from './mcp/context';
import * as common from './mcp/tools/common';
import * as snapshot from './mcp/tools/snapshot';
import type { Tool } from './mcp/tools/tool';
import { CHECK_ASSERTION, NEXT_ACTION_MCP } from './prompts';

export interface UserInputPromptContext {
  key: string;
  description: string;
}

// 메시지에서 Page Snapshot 부분을 필터링하는 함수
function filterPageSnapshotsFromMessages(messages) {
  return messages.map((message) => {
    // 메시지 객체 복사
    const filteredMessage = { ...message };

    // content가 배열인 경우 (도구 결과 등)
    if (Array.isArray(filteredMessage.content)) {
      filteredMessage.content = filteredMessage.content.map((contentItem) => {
        // contentItem이 객체인 경우만 처리
        if (typeof contentItem === 'object' && contentItem !== null) {
          // content 속성이 있는 경우 (tool_result 등)
          if (contentItem.content) {
            // 텍스트 컨텐츠에서 스냅샷 부분 제거
            if (Array.isArray(contentItem.content)) {
              // 콘텐츠가 배열인 경우
              contentItem.content = contentItem.content.map((item) => {
                if (item?.text) {
                  // Page Snapshot 부분 필터링
                  item.text = filterSnapshotFromText(item.text);
                }
                return item;
              });
            } else if (typeof contentItem.content === 'string') {
              // 콘텐츠가 문자열인 경우
              contentItem.content = filterSnapshotFromText(contentItem.content);
            }
          }
        }
        return contentItem;
      });
    } else if (typeof filteredMessage.content === 'string') {
      // content가 문자열인 경우
      filteredMessage.content = filterSnapshotFromText(filteredMessage.content);
    }

    return filteredMessage;
  });
}

// 텍스트에서 Page Snapshot 부분을 필터링하는 함수
function filterSnapshotFromText(text) {
  if (!text) return text;

  // Page Snapshot 패턴 (시작과 끝 찾기)
  const snapshotStartPattern = /- Page Snapshot\s*\n```yaml/;
  const snapshotEndPattern = /```\s*\n/;

  let result = text;
  let startMatch = result.match(snapshotStartPattern);

  while (startMatch) {
    const startIndex = startMatch.index;
    const afterStart = result.substring(startIndex);
    const endMatch = afterStart.match(snapshotEndPattern);

    if (endMatch) {
      const endIndex = endMatch.index + endMatch[0].length;
      // 스냅샷 부분을 제거하고 간단한 메시지로 대체
      result =
        result.substring(0, startIndex) +
        '- Page Snapshot: [PAST_SNAPSHOT_REMOVED]\n' +
        result.substring(startIndex + afterStart.substring(0, endIndex).length);
    } else {
      break; // 끝 패턴을 찾지 못한 경우 루프 종료
    }

    startMatch = result.match(snapshotStartPattern);
  }

  return result;
}

export class UserInput {
  constructor(
    private readonly _key: string,
    private readonly _value: string,
    private readonly _description: string,
  ) {}

  static of(key: string, value: string, description: string) {
    return new UserInput(key, value, description);
  }

  asPromptContext(): UserInputPromptContext {
    return {
      key: this._key,
      description: this._description,
    };
  }

  replaceIn(text: string) {
    return text.replace(this.toUpperSnakeCase(this._key), this._value);
  }

  private toUpperSnakeCase(text: string) {
    return text.toUpperCase().replace(/ /g, '_');
  }
}

class StateGenerationContext {
  assertion: string;
  baseUrl: string;
  inputs: UserInput[];
  maxAttempts?: number;
}

interface NextActionResponse {
  actions: Tool;
  reason: string;
}

class StateGenerator {
  NEXT_ACTION_PROMPT = NEXT_ACTION_MCP;
  ASSERTION_CHECK_PROMPT = CHECK_ASSERTION;

  constructor(private readonly llmClient: LLMClient) {}

  async generate(context: StateGenerationContext) {
    const commonTools: Tool[] = [common.pressKey, common.wait, common.pdf, common.close];
    const snapshotTools: Tool[] = [
      common.navigate(true),
      common.goBack(true),
      common.goForward(true),
      common.chooseFile(true),
      snapshot.snapshot,
      snapshot.click,
      snapshot.hover,
      snapshot.type,
      snapshot.selectOption,
      snapshot.screenshot,
      ...commonTools,
    ];

    const userInputs = context.inputs.map((input) => input.asPromptContext());
    const prompt = this.NEXT_ACTION_PROMPT.replace('{{ASSERTION}}', context.assertion)
      .replace('{{USER_INPUTS}}', JSON.stringify(userInputs))
      .replace('{{BASE_URL}}', context.baseUrl);
    let messages = [{ role: 'user', content: prompt }] as MessageParam[];

    const isAsserted = false;
    let attempts = 0;
    const maxAttempts = context.maxAttempts || 10;
    const toolContext = new Context('./', { headless: false });
    await toolContext.createPage();

    try {
      while (!isAsserted && attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts}`);

        // Get next action from LLM
        const response = await this.llmClient.messageWithTools(messages, snapshotTools);

        if (!response || !response.content) {
          console.error('Failed to get response from LLM');
          continue;
        }

        if (response.stop_reason !== 'tool_use') {
          const parsedResult = this.llmClient.parseJson((response.content[0] as TextBlock).text);
          console.log('Parsed assertion check result:', parsedResult);

          break;
        }

        // Extract the tool call if any
        const toolCall = response.content.find((block) => block.type === 'tool_use');
        if (!toolCall) {
          console.log('No tool call in response');

          // Add LLM response to messages for context
          messages.push({
            role: 'assistant',
            content: response.content,
          } as MessageParam);

          continue;
        }

        console.log(`Tool called: ${toolCall.name}`);
        console.log(`Tool input: ${JSON.stringify(toolCall.input)}`);

        // Find the corresponding tool
        const tool = snapshotTools.find((t) => t.schema.name === toolCall.name);
        if (!tool) {
          console.error(`Tool ${toolCall.name} not found`);
          throw new Error(`Tool ${toolCall.name} not found`);
        }

        // Process user inputs in the tool input
        let toolInput = JSON.stringify(toolCall.input);
        for (const input of context.inputs) {
          toolInput = input.replaceIn(toolInput);
        }
        const parsedInput = JSON.parse(toolInput);

        // Execute the tool
        try {
          const result = await tool.handle(toolContext, parsedInput);

          messages = filterPageSnapshotsFromMessages(messages);

          // Add tool execution result to messages
          messages.push({
            role: 'assistant',
            content: [
              {
                id: toolCall.id,
                type: 'tool_use',
                name: toolCall.name,
                input: toolCall.input,
              },
            ],
          } as MessageParam);

          messages.push({
            role: 'user',
            content: [
              {
                ...(result as unknown as TextBlockParam),
                type: 'tool_result',
                tool_use_id: toolCall.id,
              },
            ],
          } as MessageParam);
        } catch (error) {
          console.error(`Error executing tool ${toolCall.name}:`, error);

          messages.push({
            role: 'assistant',
            content: [
              {
                id: toolCall.id,
                type: 'tool_use',
                name: toolCall.name,
                input: toolCall.input,
              },
            ],
          } as MessageParam);

          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolCall.id,
                content: JSON.stringify({ error: error.message }),
              },
            ],
          } as MessageParam);

          await new Promise((resolve) => setTimeout(resolve, 2000));

          continue;
        }

        // Check if assertion is satisfied
        // isAsserted = await this.checkAssertion(toolContext.existingPage(), context.assertion);
        // isAsserted
        console.log(`Assertion check: ${isAsserted}`);

        // If assertion is satisfied, break the loop
        if (isAsserted) {
          console.log('Assertion satisfied!');
          break;
        }

        // Add brief delay before next attempt
      }
    } finally {
      // Close browser regardless of outcome
    }

    // write the messages to each file for history
    fs.writeFileSync(`./messages-${attempts}.json`, JSON.stringify(messages, null, 2));

    return isAsserted;
  }

  private async checkAssertion(page: Page, assertion: string) {
    const screenshot = await page.screenshot();

    const prompt = this.ASSERTION_CHECK_PROMPT.replace('{{ASSERTION}}', assertion);

    const result = await this.llmClient.messageWithImage(prompt, screenshot.toString('base64'));
    console.log('Assertion check result:', result);

    try {
      const parsedResult = this.llmClient.parseJson(result.text);
      console.log('Parsed assertion check result:', parsedResult);
      return parsedResult.isAsserted === true;
    } catch (error) {
      console.error('Failed to parse assertion check result:', error);
      return false;
    }
  }
}

async function main(
  maxAttempts: number,
  launchOptions: LaunchOptions,
  assertion: string,
  baseUrl: string,
  inputs: UserInput[],
) {
  try {
    console.log('Starting main function');
    const llmService = LLMClient.createClaude();
    const stateGenerator = new StateGenerator(llmService);

    const context: StateGenerationContext = {
      assertion: assertion,
      baseUrl: baseUrl,
      inputs: inputs,
      maxAttempts: maxAttempts,
    };
    await stateGenerator.generate(context);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

program
  .option('--headless', 'Run browser in headless mode, headed by default')
  .option('--assert, -a <assertion>', 'final state description to assert')
  .option('--url, -u <baseUrl>', 'base URL to start from')
  .option('--input, -i <inputs...>', 'user inputs')
  .option('--max-attempts -m <maxAttempts>', 'maximum number of attempts to reach the final state')
  .action(async (options) => {
    const launchOptions: LaunchOptions = {
      headless: !!options.headless,
      channel: 'chrome',
    };

    const inputs = options.input
      ? options.input.map((input) => {
          const [key, value, description] = input.split(',');
          return UserInput.of(key, value, description);
        })
      : [];

    await main(Number(options.maxAttempts), launchOptions, options.assert, options.url, inputs);
  });

program.parse();
