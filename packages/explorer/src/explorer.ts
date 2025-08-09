import type { UserInput } from './codegen/UserInput.js';
import { Gemini } from './llm/google/Gemini.js';
import { PlaywrightCodegen } from './codegen/PlaywrightCodegen.js';
import { ExecutionContext } from './codegen/ExecutionContext.js';
import logger from './logger.js';
import type { BrowserOptionsType } from './config.js';
import { PlaywrightMcpClient } from './mcp/playwright-mcp/PlaywrightMcpClient.js';

export async function explore(
  maxAttempts: number,
  scenario: string,
  baseUrl: string,
  inputs: UserInput[],
  apiKey: string,
  domainContext: string[],
  precondition: string,
  browserOptions: BrowserOptionsType,
  expectation?: string,
  steps?: string[],
) {
  let playwrightMcpClient: PlaywrightMcpClient;

  try {
    const llmClient = new Gemini(apiKey);
    const context = ExecutionContext.init(scenario, baseUrl, inputs, domainContext, expectation, steps);

    playwrightMcpClient = new PlaywrightMcpClient(browserOptions, context.id);
    await playwrightMcpClient.connect();

    const codegen = new PlaywrightCodegen(llmClient, playwrightMcpClient);
    return await codegen.generate(context, maxAttempts);
  } catch (e) {
    logger.error('Error during exploration:', e);
    return null;
  } finally {
    // @ts-ignore
    if (playwrightMcpClient) {
      await playwrightMcpClient.close();
    }
  }
}
