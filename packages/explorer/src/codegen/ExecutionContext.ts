import type { UserInput } from './UserInput.js';
import { v4 } from 'uuid';

export class ExecutionContext {
  constructor(
    readonly id: string,
    readonly scenario: string,
    readonly baseUrl: string,
    readonly userInputs: UserInput[],
    readonly domainContext: string[] = [],
  ) {}

  static init(
    scenario: string,
    baseUrl: string,
    userInputs: UserInput[] = [],
    domainContext: string[] = [],
    id: string = v4(),
  ): ExecutionContext {
    return new ExecutionContext(id, scenario, baseUrl, userInputs, domainContext);
  }
}
