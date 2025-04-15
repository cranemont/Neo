import { Page, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

export async function runScenario(page: Page, scenarioId: string): Promise<void> {
  // 시나리오 JSON 파일 읽기
  const scenarioPath = path.join(process.cwd(), 'scenarios', `${scenarioId}.json`);
  const scenarioContent = await fs.readFile(scenarioPath, 'utf-8');
  const scenario = JSON.parse(scenarioContent);

  // 시나리오의 actions 실행
  for (const action of scenario.actions) {
    switch (action.toolName) {
      case 'playwright_navigate':
        await page.goto(action.parameters.url);
        break;

      case 'playwright_click':
        await page.click(action.parameters.selector);
        break;

      case 'playwright_fill':
        await page.fill(action.parameters.selector, action.parameters.value);
        break;

      case 'playwright_hover':
        await page.hover(action.parameters.selector);
        break;

      case 'playwright_screenshot':
        await page.screenshot({
          path: `${action.parameters.name}.png`,
          fullPage: action.parameters.fullPage
        });
        break;

      case 'playwright_expect_response':
        await page.waitForResponse(action.parameters.url);
        break;
    }
  }

  // 시나리오의 assertions 실행
  for (const assertion of scenario.assertions) {
    switch (assertion.toolName) {
      case 'playwright_assert_response':
        const response = await page.waitForResponse(assertion.parameters.url);
        expect(response.ok()).toBeTruthy();
        break;

      case 'playwright_url':
        await expect(page).toHaveURL(assertion.parameters.url);
        break;

      case 'playwright_count':
        const elements = await page.locator(assertion.parameters.selector);
        const count = await elements.count();
        if (assertion.parameters.count.startsWith('>')) {
          const expected = parseInt(assertion.parameters.count.slice(1));
          expect(count).toBeGreaterThan(expected);
        } else {
          expect(count).toBe(parseInt(assertion.parameters.count));
        }
        break;
    }
  }
} 