import { type ExecutionResult, ExecutionStatus } from '../codegen/ExecutionResult.js';
import type { EvaluationResult } from '../llm/prompt/evaluate.js';
import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import logger from '../logger.js';

class TestStatus {
  static readonly PASSED = new TestStatus('PASSED');
  static readonly PASSED_SUSPICIOUS = new TestStatus('PASSED_SUSPICIOUS');
  static readonly FAILED = new TestStatus('FAILED');
  static readonly FAILED_SUSPICIOUS = new TestStatus('FAILED_SUSPICIOUS');
  static readonly ERROR = new TestStatus('ERROR');

  constructor(readonly code: string) {}

  static of(executionStatus: ExecutionStatus, evaluationResult?: EvaluationResult): TestStatus {
    switch (executionStatus) {
      case ExecutionStatus.SUCCESS:
        return evaluationResult?.isValid ? TestStatus.PASSED : TestStatus.PASSED_SUSPICIOUS;
      case ExecutionStatus.FAILURE:
        return evaluationResult?.isValid ? TestStatus.FAILED : TestStatus.FAILED_SUSPICIOUS;
      case ExecutionStatus.ERROR:
        return TestStatus.ERROR;
      default:
        throw new Error(`Unknown execution status: ${executionStatus}`);
    }
  }
}

export class Report {
  readonly results: {
    id: string;
    scenario: string;
    status: string;
    statusDescription: string;
    evaluation?: {
      isStatusValid: boolean;
      reason: string;
    };
    generatedCodes: {
      actions: string[];
      assertion?: string;
    };
    context: {
      baseUrl: string;
      userInputs: { key: string; description: string; value: string }[];
      domainContext: string[];
    };
  }[];

  constructor(
    results: {
      id: string;
      executionResult: ExecutionResult;
      evaluationResult?: EvaluationResult;
    }[],
  ) {
    this.results = results.map((result) => {
      return {
        id: result.id,
        scenario: result.executionResult.executionContext.scenario,
        status: TestStatus.of(result.executionResult.status, result.evaluationResult).code,
        statusDescription: result.executionResult.description,
        evaluation: result.evaluationResult
          ? {
              isStatusValid: result.evaluationResult.isValid,
              reason: result.evaluationResult.reason,
            }
          : undefined,
        generatedCodes: {
          actions: [...result.executionResult.playwrightCodes],
          assertion: result.executionResult.playwrightAssertion,
        },
        context: {
          baseUrl: result.executionResult.executionContext.baseUrl,
          userInputs: result.executionResult.executionContext.userInputs.map((input) => {
            return {
              key: input.key,
              description: input.description,
              value: input.value,
            };
          }),
          domainContext: [...result.executionResult.executionContext.domainContext],
        },
      };
    });
  }

  exportWithTraces(baseDir: string, traceDir: string) {
    // Create a map to group results by status
    const resultsByStatus = new Map<string, typeof this.results>();

    for (const result of this.results) {
      if (!resultsByStatus.has(result.status)) {
        resultsByStatus.set(result.status, []);
      }
      resultsByStatus.get(result.status)?.push(result);
    }

    // Process each status group
    for (const [status, statusResults] of resultsByStatus.entries()) {
      const statusDir = path.join(baseDir, status);

      if (!this.createDirectory(statusDir, `status directory for ${status}`)) {
        return;
      }

      for (const result of statusResults) {
        const resultDir = path.join(statusDir, result.id);

        if (!this.createDirectory(resultDir, `result directory for ${result.id}`)) {
          return;
        }

        this.writeReportJson(resultDir, result);
        this.generatePlaywrightTestFileWithErrorHandling(resultDir, result);
        this.createTraceZip(traceDir, resultDir, result);
      }
    }
  }

  private createDirectory(dirPath: string, dirDescription: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (error) {
      logger.error(`Failed to create ${dirDescription}: ${error}`);
      return false;
    }
  }

  private writeReportJson(resultDir: string, result: (typeof this.results)[number]) {
    try {
      fs.writeFileSync(path.join(resultDir, 'report.json'), JSON.stringify(result, null, 2));
    } catch (fileError) {
      logger.error(`Failed to write report.json for ${result.id}: ${fileError}`);
    }
  }

  private generatePlaywrightTestFileWithErrorHandling(resultDir: string, result: (typeof this.results)[number]) {
    try {
      const testFilePath = path.join(resultDir, `test-${result.id}.spec.ts`);
      const testContent = this.generateTestContent(result);
      fs.writeFileSync(testFilePath, testContent);
    } catch (testFileError) {
      logger.error(`Failed to generate Playwright test file for ${result.id}: ${testFileError}`);
    }
  }

  private createTraceZip(traceDir: string, resultDir: string, result: (typeof this.results)[number]) {
    try {
      const sourceTraceDir = path.join(traceDir, result.id);
      if (!fs.existsSync(sourceTraceDir)) {
        return;
      }

      const zip = new AdmZip();
      const zipFilePath = path.join(resultDir, 'trace.zip');

      zip.addLocalFolder(sourceTraceDir);
      zip.writeZip(zipFilePath);
    } catch (zipError) {
      logger.error(`Failed to create zip file for ${result.id}: ${zipError}`);
    }
  }

  private generateTestContent(result: (typeof this.results)[number]): string {
    let testContent = this.generateTestHeader(result);
    testContent = this.addActionsToTestContent(testContent, result);
    testContent = this.addAssertionsToTestContent(testContent, result);
    testContent += '});\n';
    return testContent;
  }

  private generateTestHeader(result: (typeof this.results)[number]): string {
    try {
      return `import { test, expect } from '@playwright/test';

test('${result.scenario.replace(/'/g, "\\'")}', async ({ page }) => {
  // Base URL: ${result.context.baseUrl}
`;
    } catch (contentError) {
      logger.error(`Failed to generate test file header for ${result.id}: ${contentError}`);
      return `import { test, expect } from '@playwright/test';

test('Test for ${result.id}', async ({ page }) => {
  // Error generating test header: ${contentError}
`;
    }
  }

  private addActionsToTestContent(testContent: string, result: (typeof this.results)[number]): string {
    try {
      let updatedContent = testContent;
      if (result.generatedCodes.actions && result.generatedCodes.actions.length > 0) {
        for (const action of result.generatedCodes.actions) {
          updatedContent += `  ${action}\n`;
        }
      }
      return updatedContent;
    } catch (actionsError) {
      logger.error(`Failed to add actions to test file for ${result.id}: ${actionsError}`);
      return `${testContent}  // Error adding actions: ${actionsError}\n`;
    }
  }

  private addAssertionsToTestContent(testContent: string, result: (typeof this.results)[number]): string {
    try {
      let updatedContent = testContent;
      if (result.generatedCodes.assertion) {
        updatedContent += '\n  // Assertions (commented due to potential accuracy issues)\n';
        const assertionLines = result.generatedCodes.assertion.split('\n');
        for (const line of assertionLines) {
          updatedContent += `  // ${line}\n`;
        }
      }
      if (result.status !== TestStatus.PASSED.code) {
        updatedContent += `  // Test status: ${result.status}\n`;
        if (result.evaluation) {
          updatedContent += `  // Evaluation: ${result.evaluation.isStatusValid ? 'Valid' : 'Invalid'} - ${result.evaluation.reason}\n`;
        }

        if (result.status === TestStatus.ERROR.code || result.status === TestStatus.FAILED.code) {
          // mark as failed
          updatedContent += '  expect(true).toBe(false); // Test failed due to an error\n';
        } else {
          // mark as flaky TODO: find better way to mark flaky tests
          updatedContent += '  expect(true).toBe(false); // Test is flaky\n';
        }
      }
      return updatedContent;
    } catch (assertionError) {
      logger.error(`Failed to add assertions to test file for ${result.id}: ${assertionError}`);
      return `${testContent}  // Error adding assertions: ${assertionError}\n`;
    }
  }
}
