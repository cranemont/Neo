import type { UserInput } from './UserInput.js';

export class ScenarioContext {
  constructor(
    readonly scenario: string,
    readonly baseUrl: string,
    readonly userInputs: UserInput[],
  ) {}

  get userInputContext() {
    return this.userInputs.map((input) => input.keyWithDescription);
  }
}
