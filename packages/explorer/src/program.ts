import { program } from 'commander';
import { UserInput } from './codegen/UserInput.js';
import { record } from './record.js';
import { explore } from './explorer.js';
import { exploreFromFile } from './fileExplorer.js';
import logger from './logger.js';
import fs from 'node:fs';
import { Gemini } from './llm/google/Gemini.js';
import yaml from "js-yaml";
import { ExplorerConfig } from "./config.js";
import { Evaluator } from "./evaluator/Evaluator.js";

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

    const result = await explore(
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

    if (!result) {
      logger.error('No result returned from the exploration.');
      return;
    }

    fs.writeFileSync('./test_result.json', JSON.stringify(result.toJSON(), null, 2));
  });

program
  .command('explore-file')
  .description('Explore a scenario using a YAML configuration file')
  .requiredOption('--file, -f <filePath>', 'path to the YAML configuration file')
  .option('--evaluate, -e <evaluate>', 'whether to evaluate the result', true)
  .action(async (options) => {
    try {
      logger.info(`Exploring scenario from file: ${options.file}`);

      const fileContent = fs.readFileSync(`${process.cwd()}/../../${options.file}`, 'utf8');
      const config = ExplorerConfig.parse(yaml.load(fileContent));

      const results = await exploreFromFile(config);

      fs.writeFileSync(
        './test_results.json',
        JSON.stringify(
          results.map((result) => result.toJSON()),
          null,
          2,
        ),
      );

      if (options.evaluate) {
        // WARN: consider cost and API limits before running evaluation.
        const llmClient = new Gemini(config.apiKey, 'gemini-2.5-pro-preview-06-05');
        const evaluator = new Evaluator(llmClient);

        const evaluationResults = await evaluator.evaluate(results, 5);

        fs.writeFileSync(
          './evaluation_results.json',
          JSON.stringify(
            evaluationResults.map((result) => ({
              id: result.id,
              evaluationResult: result.evaluationResult,
              executionResult: result.executionResult.toJSON(),
            })),
            null,
            2,
          ),
        );
      } else {
        logger.info('Skipping evaluation as per user request.');
      }
    } catch (e) {
      logger.error(`Error during exploration from file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  });

void program.parseAsync();
