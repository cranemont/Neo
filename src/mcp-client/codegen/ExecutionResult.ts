import type { ExecutionContext } from './ExecutionContext.js';

export enum ExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}
export class ExecutionResult {
  constructor(
    readonly id: string,
    readonly executionContext: ExecutionContext,
    readonly status: ExecutionStatus,
    readonly description: string,
    readonly playwrightCodes: string[],
    readonly playwrightAssertion?: string,
  ) {}

  static ofSuccess(
    id: string,
    executionContext: ExecutionContext,
    description: string,
    playwrightCodes: string[],
    playwrightAssertion?: string,
  ): ExecutionResult {
    return new ExecutionResult(
      id,
      executionContext,
      ExecutionStatus.SUCCESS,
      description,
      playwrightCodes,
      playwrightAssertion,
    );
  }

  static ofFailure(
    id: string,
    executionContext: ExecutionContext,
    description: string,
    playwrightCodes: string[] = [],
    playwrightAssertion?: string,
  ): ExecutionResult {
    return new ExecutionResult(
      id,
      executionContext,
      ExecutionStatus.FAILURE,
      description,
      playwrightCodes,
      playwrightAssertion,
    );
  }
}
