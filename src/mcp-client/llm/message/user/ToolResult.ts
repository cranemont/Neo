import type { ToolUse } from '../assistant/ToolUse.js';

export class ToolResult {
  constructor(
    readonly toolUse: ToolUse,
    readonly content: unknown[] | string,
    readonly isError: boolean = false,
  ) {}

  static success(toolUseContext: ToolUse, content: unknown[]): ToolResult {
    return new ToolResult(toolUseContext, content, false);
  }

  static error(toolUseContext: ToolUse, errorMessage: string): ToolResult {
    return new ToolResult(toolUseContext, errorMessage, true);
  }

  get id(): string {
    return this.toolUse.id;
  }

  get name(): string {
    return this.toolUse.name;
  }
}
