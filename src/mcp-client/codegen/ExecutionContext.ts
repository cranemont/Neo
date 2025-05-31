import type { UserInput } from "./UserInput.js";
import { v4 } from "uuid";
import { LocalDateTime } from "js-joda";

export enum ExecutionStatus {
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export class ExecutionContext {
  constructor(
    readonly id: string,
    readonly scenario: string,
    readonly baseUrl: string,
    readonly status: ExecutionStatus,
    readonly userInputs: UserInput[],
    readonly domainContext: Record<string, string>,
    readonly playwrightCodes: string[],
    readonly createdAt: LocalDateTime,
  ) {}

  static init(
    scenario: string,
    baseUrl: string,
    userInputs: UserInput[] = [],
    domainContext: Record<string, string> = {},
    id: string = v4(),
  ): ExecutionContext {
    return new ExecutionContext(
      id,
      scenario,
      baseUrl,
      ExecutionStatus.PROCESSING,
      userInputs,
      domainContext,
      [],
      LocalDateTime.now(),
    );
  }
}
