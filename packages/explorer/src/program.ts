import { program } from 'commander';
import { UserInput } from './codegen/UserInput.js';
import { record } from './record.js';
import { explore } from './explorer.js';
import { exploreFromFile } from './fileExplorer.js';
import logger from "./logger.js";

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
  .requiredOption('--scenario, -s <scenario>', 'scenario to run')
  .requiredOption('--url, -u <baseUrl>', 'base URL to start from')
  .requiredOption('--api-key, -k <apiKey>', 'API key for the LLM')
  .option('--input, -i [inputs...]', 'user inputs')
  .option('--domain-context, -d [domainContext...]', 'domain context')
  .option('--max-attempts -m [maxAttempts]', 'maximum number of attempts to reach the final state', '50')
  .option('--precondition, -p [precondition]', 'precondition file name to run before scenario')
  .option('--browser [browser]', 'browser type (chromium, firefox, webkit)', 'chromium')
  .option('--headless [Boolean]', 'run in headless mode', false)
  .option('--traces-dir [dir]', 'directory to save trace files')
  .option('--user-data-dir [dir]', 'browser user data directory')
  .option('--output-dir [dir]', 'directory to save downloaded files')
  .option('--isolated [Boolean]', 'enable browser isolation mode', true)
  .option('--save-trace [Boolean]', 'save trace files', false)
  .action(async (options) => {
    const inputs = options.input
      ? options.input.map((input) => {
          const [key, value, description] = input.split(',');
          return UserInput.of(key, value, description);
        })
      : [];

    logger.info(
      `Exploring scenario "${options.scenario}" at URL "${options.url}" with inputs: ${JSON.stringify(inputs)}`,
    );

    await explore(
      Number(options.maxAttempts),
      options.scenario,
      options.url,
      inputs,
      options.apiKey,
      options.domainContext ?? [],
      options.precondition,
      {
        browser: options.browser as 'chromium' | 'firefox' | 'webkit',
        headless: options.headless,
        tracesDir: options.tracesDir,
        userDataDir: options.userDataDir,
        outputDir: options.outputDir,
        isolated: options.isolated,
        saveTrace: options.saveTrace,
      },
    );
  });

program
  .command('explore-file')
  .description('Explore a scenario using a YAML configuration file')
  .requiredOption('--file, -f <filePath>', 'path to the YAML configuration file')
  .action(async (options) => {
    logger.info(`Exploring scenario from file: ${options.file}`);
    await exploreFromFile(options.file);
  });

void program.parseAsync();
