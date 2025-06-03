import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { program } from 'commander';
import { UserInput } from './codegen/UserInput.js';
import { PlaywrightCodegen } from './codegen/PlaywrightCodegen.js';
import { Gemini } from './llm/google/Gemini.js';
import { ExecutionContext } from './codegen/ExecutionContext.js';
import { MCPClient } from './mcp/MCPClient.js';
import { Recorder } from './codegen/Recorder.js';

async function explore(
  maxAttempts: number,
  scenario: string,
  baseUrl: string,
  inputs: UserInput[],
  apiKey: string,
  domainContext: string[],
  precondition: string,
) {
  let mcp: Client;

  try {
    // const llmClient = new Claude(apiKey);
    const llmClient = new Gemini(apiKey);

    mcp = new Client({ name: 'playwright-codegen', version: '1.0.0' });
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['../playwright-mcp/dist/server.js'],
      env: {
        ...process.env,
        PRECONDITION_NAME: precondition,
      },
    });
    await mcp.connect(transport);

    const codegen = new PlaywrightCodegen(llmClient, new MCPClient(mcp));
    const context = ExecutionContext.init(scenario, baseUrl, inputs, domainContext);

    const result = await codegen.generate(context);

    console.log(`\`\`\`result\n${JSON.stringify(result)}\n\`\`\``);
  } catch (e) {
    console.log(e);
  } finally {
    // @ts-ignore
    if (mcp) {
      await mcp.close();
    }
    process.exit(0);
  }
}

async function record(options: {
  url: string;
  outputFile?: string;
  language: 'playwright-test' | 'javascript' | 'python' | 'java';
  headless: boolean;
}) {
  try {
    const defaultOutputFile =
      options.outputFile ??
      `./preconditions/recording-${new Date().toISOString().replace(/[:.]/g, '-')}.spec.${options.language === 'python' ? 'py' : options.language === 'java' ? 'java' : 'js'}`;

    console.log('Starting recorder...');
    console.log(`URL: ${options.url}`);
    console.log(`Output file: ${defaultOutputFile}`);
    console.log(`Language: ${options.language ?? 'javascript'}`);
    console.log(`Headless mode: ${options.headless ? 'enabled' : 'disabled'}`);
    console.log('\nPress Ctrl+C to stop recording\n');

    const { browser, context, page } = await Recorder.startRecording({
      ...options,
      outputFile: defaultOutputFile,
    });

    process.on('SIGINT', async () => {
      console.log('\nStopping recorder...');
      await browser.close();
      process.exit(0);
    });
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

program
  .command('record')
  .description('Start Playwright recorder')
  .requiredOption('--url, -u <url>', 'URL to record')
  .option('--output-file, -o [outputFile]', 'Output file path')
  .option('--language, -l <language>', 'Output language (javascript, python, java)', 'playwright-test')
  .option('--headless', 'Run in headless mode', false)
  .action(record);

program
  .command('explore')
  .description('Explore a scenario using the LLM and MCP')
  .option('--scenario, -s <scenario>', 'scenario to run')
  .option('--url, -u <baseUrl>', 'base URL to start from')
  .option('--input, -i [inputs...]', 'user inputs')
  .option('--domain-context, -d [domainContext...]', 'domain context')
  .option('--max-attempts -m [maxAttempts]', 'maximum number of attempts to reach the final state', '50')
  .option('--api-key, -k <apiKey>', 'API key for the LLM')
  .option('--precondition, -p [precondition]', 'precondition file name to run before scenario')
  .action(async (options) => {
    const inputs = options.input
      ? options.input.map((input) => {
          const [key, value, description] = input.split(',');
          return UserInput.of(key, value, description);
        })
      : [];

    await explore(
      Number(options.maxAttempts),
      options.scenario,
      options.url,
      inputs,
      options.apiKey,
      options.domainContext ?? [],
      options.precondition,
    );
  });

program.parse();
