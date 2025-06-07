import fs from 'node:fs';
import yaml from 'js-yaml';
import logger from './logger.js';
import { UserInput } from './codegen/UserInput.js';
import { explore } from './explorer.js';
import type { ExecutionResult } from './codegen/ExecutionResult.js';
import { ExplorerConfig } from './config.js';

export async function exploreFromFile(filePath: string) {
  try {
    const fileContent = fs.readFileSync(`${process.cwd()}/../../${filePath}`, 'utf8');
    const rawConfig = yaml.load(fileContent);

    const config = ExplorerConfig.parse(rawConfig);

    const results: ExecutionResult[] = [];

    for (const testContext of config.testContexts) {
      const baseUrl = testContext.baseUrl ?? config.baseUrl;

      logger.info(`Exploring scenario "${testContext.scenario}" at URL "${baseUrl}"}`);

      const result = await explore(
        config.maxAttempts,
        testContext.scenario,
        baseUrl,
        [...config.inputs, ...testContext.inputs].map((input) =>
          UserInput.of(input.key, input.value, input.description ?? ''),
        ),
        config.apiKey,
        [...config.domainContext, ...testContext.domainContext],
        testContext.precondition ?? '',
        {
          ...config.browserOptions,
          ...testContext.browserOptions,
        },
      );

      if (result !== null) {
        results.push(result);
      } else {
        logger.warn(`Exploration for scenario "${testContext.scenario}" failed or returned null`);
      }
    }

    fs.writeFileSync(`${process.cwd()}/../../exploration-results.yaml`, yaml.dump(results, { noRefs: true }));

    logger.info(`Exploration completed. Results: ${JSON.stringify(results)}`);
    return results;
  } catch (e) {
    logger.error('Error during file-based exploration:', e);
    throw e;
  }
}
