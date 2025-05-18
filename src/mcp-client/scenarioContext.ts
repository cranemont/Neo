import type { UserInputContext } from './InputContext.js';

export class ScenarioContext {
  constructor(
    readonly scenario: string,
    readonly baseUrl: string,
    readonly userInputs: UserInputContext[],
  ) {}
}
