import type { ConversionResult, PlaywrightAction, TestScenario } from '../types';

const ERROR_MESSAGES = {
  INVALID_SCENARIO: 'Invalid scenario: missing required fields',
  UNSUPPORTED_ACTION: (action: string) => `Unsupported action: ${action}`,
  MISSING_BASE_URL: 'baseUrl is required for relative URL assertions',
} as const;

/**
 * 테스트 시나리오를 Playwright 테스트 파일로 변환하는 클래스
 */
export class ScenarioConverter {
  private readonly SUPPORTED_ACTIONS = [
    'playwright_navigate',
    'playwright_click',
    'playwright_hover',
    'playwright_fill',
    'playwright_select',
    'playwright_screenshot',
    'playwright_expect_response',
    'playwright_assert_response',
    'playwright_url',
    'playwright_count',
  ] as const;

  constructor(
    private scenario: TestScenario,
    private options = {
      outputDir: 'tests',
      includeComments: true,
    },
  ) {}

  /**
   * 시나리오 구조와 지원되는 액션들을 검증
   * @throws {Error} 시나리오가 유효하지 않거나 지원되지 않는 액션이 포함된 경우
   */
  private validateScenario() {
    if (!this.scenario.id || !this.scenario.scenario || !this.scenario.actions) {
      throw new Error(ERROR_MESSAGES.INVALID_SCENARIO);
    }

    // 액션 검증
    this.scenario.actions.forEach((action) => {
      if (!this.SUPPORTED_ACTIONS.includes(action.toolName as any)) {
        throw new Error(ERROR_MESSAGES.UNSUPPORTED_ACTION(action.toolName));
      }
    });

    // assertion이 있는 경우 검증
    this.scenario.assertions?.forEach((assertion) => {
      if (!this.SUPPORTED_ACTIONS.includes(assertion.toolName as any)) {
        throw new Error(ERROR_MESSAGES.UNSUPPORTED_ACTION(assertion.toolName));
      }
    });

    // 상대 URL assertion이 있는 경우 baseUrl 검증
    if (
      this.scenario.assertions?.some(
        (assertion) =>
          assertion.toolName === 'playwright_url' && assertion.parameters.url.startsWith('/') && !this.scenario.baseUrl,
      )
    ) {
      throw new Error(ERROR_MESSAGES.MISSING_BASE_URL);
    }
  }

  /**
   * 테스트 파일에 필요한 import 구문 생성
   */
  private generateImports(): string {
    let imports = `import { test, expect } from '@playwright/test';\n`;

    if (this.scenario.preconditions?.length) {
      imports += `import { runScenario } from '../src/helpers/scenarioRunner';\n`;
    }

    return imports;
  }

  /**
   * Playwright 액션을 테스트 스텝으로 변환
   * @param action 변환할 액션
   * @returns 변환된 테스트 스텝 코드
   */
  private convertActionToStep(action: PlaywrightAction): string {
    const { toolName, parameters } = action;

    switch (toolName) {
      case 'playwright_navigate':
        return `await page.goto('${parameters.url}');`;

      case 'playwright_click':
        return `await page.click('${parameters.selector}');`;

      case 'playwright_hover':
        return `await page.hover('${parameters.selector}');`;

      case 'playwright_fill':
        return `await page.fill('${parameters.selector}', '${parameters.value}');`;

      case 'playwright_select':
        return `await page.selectOption('${parameters.selector}', '${parameters.value}');`;

      case 'playwright_screenshot':
        const options = parameters.fullPage ? 'fullPage: true' : '';
        return `await page.screenshot({ path: '${parameters.name}.png'${options ? ', ' + options : ''} });`;

      case 'playwright_expect_response':
        return `const ${parameters.id}Response = await page.waitForResponse('${parameters.url}');`;

      default:
        throw new Error(ERROR_MESSAGES.UNSUPPORTED_ACTION(toolName));
    }
  }

  /**
   * 사전 조건 설정 코드 생성
   */
  private generatePreconditions(): string {
    if (!this.scenario.preconditions?.length) return '';

    const preconditionSteps = this.scenario.preconditions
      .map((scenarioId) => `  await runScenario(page, "${scenarioId}");`)
      .join('\n');

    return `// 사전 조건 설정
test.beforeEach(async ({ page }) => {
${preconditionSteps}
});
  `;
  }

  /**
   * 시나리오의 assertion들을 코드로 생성
   */
  private generateAssertions(): string {
    if (!this.scenario.assertions?.length) return '';

    const assertionSteps = this.scenario.assertions
      .map((assertion) => {
        const step = this.convertAssertionToStep(assertion);
        return this.options.includeComments
          ? `  // ${assertion.description || assertion.toolName}\n  ${step}`
          : `  ${step}`;
      })
      .join('\n\n');

    return `\n${assertionSteps}`;
  }

  /**
   * Playwright assertion을 테스트 스텝으로 변환
   * @param assertion 변환할 assertion
   * @returns 변환된 assertion 코드
   */
  private convertAssertionToStep(assertion: PlaywrightAction): string {
    const { toolName, parameters } = assertion;

    switch (toolName) {
      case 'playwright_assert_response':
        if (parameters.value) {
          return `const responseText = await ${parameters.id}Response.text();
  expect(responseText).toContain('${parameters.value}');`;
        }
        return `expect(${parameters.id}Response.ok()).toBeTruthy();`;

      case 'playwright_url':
        const expectedUrl = parameters.url.startsWith('/')
          ? `${this.scenario.baseUrl}${parameters.url}`
          : parameters.url;
        return `await expect(page).toHaveURL('${expectedUrl}');`;

      case 'playwright_count':
        let count = 1; // 기본값
        if (typeof parameters.count === 'number') {
          count = parameters.count;
        } else if (typeof parameters.count === 'string') {
          // '> 0'와 같은 형식에서 숫자만 추출
          const match = parameters.count.match(/\d+/);
          if (match) {
            count = Number.parseInt(match[0], 10);
          }
        }
        return `await expect(page.locator('${parameters.selector}')).toHaveCount(${count});`;

      default:
        throw new Error(ERROR_MESSAGES.UNSUPPORTED_ACTION(toolName));
    }
  }

  /**
   * 시나리오를 Playwright 테스트 파일로 변환
   * @returns 테스트 코드와 파일 정보를 포함한 변환 결과
   */
  public async convert(): Promise<ConversionResult> {
    this.validateScenario();

    const steps = this.scenario.actions
      .map((action) => {
        const step = this.convertActionToStep(action);
        return this.options.includeComments ? `  // ${action.description || action.toolName}\n  ${step}` : `  ${step}`;
      })
      .join('\n\n');

    const testCode = `${this.generateImports()}
${this.generatePreconditions()}
test('${this.scenario.scenario}', async ({ page }) => {
${steps}${this.generateAssertions()}
});
`;

    return {
      testCode,
      filePath: `${this.options.outputDir}/${this.scenario.id}.spec.ts`,
      scenarioId: this.scenario.id,
    };
  }
}
