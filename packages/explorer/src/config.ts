import z from 'zod';

export const BrowserOptions = z
  .object({
    browser: z.enum(['chromium', 'firefox', 'webkit']).optional().describe('Browser type'),
    headless: z.boolean().optional().describe('Run in headless mode'),
    tracesDir: z.string().optional().describe('Directory to save trace files'),
    userDataDir: z.string().optional().describe('Browser user data directory'),
    outputDir: z.string().optional().describe('Directory to save downloaded files'),
    isolated: z.boolean().optional().describe('Enable browser isolation mode'),
    saveTrace: z.boolean().optional().describe('Save trace files'),
    storageState: z.string().optional().describe('Path to storage state file'),
  })
  .describe('Playwright browser options');

export const UserInput = z.object({
  key: z.string().describe('Input key'),
  value: z.string().describe('Input value'),
  description: z.string().default('').describe('Optional description of the input'),
});

export const TestContext = z
  .object({
    scenario: z.string().describe('Scenario to run'),
    baseUrl: z.string().optional().describe('Base URL to start from'),
    inputs: z.array(UserInput).default([]).describe('User inputs for the scenario'),
    domainContext: z.array(z.string()).default([]).describe('Domain context for the scenario'),
    precondition: z.string().default('').describe('Precondition file name to run before scenario'),
    browserOptions: BrowserOptions.optional(),
  })
  .describe('Test context configuration for the scenario');

export const ExplorerConfig = z.object({
  apiKey: z.string().describe('API key for the LLM'),
  maxAttempts: z.number().default(50).describe('Maximum number of attempts to reach the final state'),
  baseUrl: z.string().describe('Global base URL for all scenarios'),
  inputs: z.array(UserInput).default([]).describe('Global inputs for all scenarios'),
  domainContext: z.array(z.string()).default([]).describe('Global domain context for all scenarios'),
  browserOptions: z.object({
    ...BrowserOptions.shape,
    browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
    headless: z.boolean().default(false),
    isolated: z.boolean().default(true),
    saveTrace: z.boolean().default(false),
    tracesDir: z.string().default('./traces'),
    userDataDir: z.string().default('./userData'),
    outputDir: z.string().default('./downloads'),
    storageState: z.string().optional(),
  }),
  testContexts: z.array(TestContext).nonempty(),
});

export type ExploreConfigType = z.infer<typeof ExplorerConfig>;
export type UserInputType = z.infer<typeof UserInput>;
export type TestContextType = z.infer<typeof TestContext>;
export type BrowserOptionsType = z.infer<typeof BrowserOptions>;
