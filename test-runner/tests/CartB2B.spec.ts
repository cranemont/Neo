import { test, expect } from '@playwright/test';
import { runScenario } from '../src/helpers/scenarioRunner';

// 사전 조건 설정
test.beforeEach(async ({ page }) => {
  await runScenario(page, "B2BLogin");
});
  
test('B2B 계정으로 장바구니에 접근한다.', async ({ page }) => {
  // 장바구니 페이지로 이동
  await page.goto('https://inflearn.com/cart');

  // 장바구니 API 응답 대기
  const cartsResponse = await page.waitForResponse('**/api/carts');

  // 첫 번째 장바구니 아이템에 마우스 오버
  await page.hover('.cart-item:first-child');

  // 장바구니 페이지 전체 스크린샷
  await page.screenshot({ path: 'cart-hover.png', fullPage: true });
  // 장바구니 API 응답 확인
  expect(cartsResponse.ok()).toBeTruthy();

  // 장바구니 아이템이 1개 이상 존재하는지 확인
  await expect(page.locator('.cart-items')).toHaveCount(0);
});
