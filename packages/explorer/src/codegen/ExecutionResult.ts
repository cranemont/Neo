import type { ExecutionContext } from './ExecutionContext.js';

export enum ExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  ERROR = 'ERROR',
}

export class ExecutionResult {
  constructor(
    readonly id: string,
    readonly executionContext: ExecutionContext,
    readonly status: ExecutionStatus,
    readonly description: string,
    readonly playwrightCodes: string[],
    readonly playwrightAssertion?: string,
    readonly lastSnapshot?: string,
  ) {}

  static ofSuccess(
    id: string,
    executionContext: ExecutionContext,
    description: string,
    playwrightCodes: string[],
    playwrightAssertion?: string,
    lastSnapshot?: string,
  ): ExecutionResult {
    return new ExecutionResult(
      id,
      executionContext,
      ExecutionStatus.SUCCESS,
      description,
      playwrightCodes,
      playwrightAssertion,
      lastSnapshot,
    );
  }

  static ofFailure(
    id: string,
    executionContext: ExecutionContext,
    description: string,
    playwrightCodes: string[] = [],
    playwrightAssertion?: string,
    lastSnapshot?: string,
  ): ExecutionResult {
    return new ExecutionResult(
      id,
      executionContext,
      ExecutionStatus.FAILURE,
      description,
      playwrightCodes,
      playwrightAssertion,
      lastSnapshot,
    );
  }

  static ofError(
    id: string,
    executionContext: ExecutionContext,
    description: string,
    playwrightCodes: string[] = [],
    playwrightAssertion?: string,
    lastSnapshot?: string,
  ): ExecutionResult {
    return new ExecutionResult(
      id,
      executionContext,
      ExecutionStatus.ERROR,
      description,
      playwrightCodes,
      playwrightAssertion,
      lastSnapshot,
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      executionContext: {
        scenario: this.executionContext.scenario,
        baseUrl: this.executionContext.baseUrl,
        userInputs: {
          inputs: this.executionContext.userInputs.map((input) => ({
            key: input.key,
            value: input.value,
            description: input.description,
          })),
        },
        domainContext: this.executionContext.domainContext,
        expectation: this.executionContext.expectation,
        steps: this.executionContext.steps,
      },
      status: this.status,
      description: this.description,
      playwrightCodes: this.playwrightCodes,
      playwrightAssertion: this.playwrightAssertion,
    };
  }
}
