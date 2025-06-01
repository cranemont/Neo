export interface TestScenario {
  id: string;
  scenario: string;
  baseUrl: string;
  actions: PlaywrightAction[];
  preconditions?: string[];
  assertions?: PlaywrightAction[];
  createdAt: string;
}

export interface PlaywrightAction {
  toolName: string;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  parameters: Record<string, any>;
  description?: string;
}

export interface ConversionResult {
  testCode: string;
  filePath: string;
  scenarioId: string;
}
