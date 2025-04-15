import { test, expect } from '@playwright/test';


test('B2B 계정으로 로그인한다.', async ({ page }) => {
  // 홈페이지로 이동
  await page.goto('https://inflearn.com');

  // 로그인 버튼 클릭
  await page.click('#header .login-button');

  // 이메일 입력
  await page.fill('#email', 'test@example.com');

  // 비밀번호 입력
  await page.fill('#password', 'password123');

  // 로그인 제출
  await page.click('#submit-login');

  // 로그인 API 응답 대기
  const loginResponse = await page.waitForResponse('**/api/auth/login');
  // 로그인 API 응답 확인
  expect(loginResponse.ok()).toBeTruthy();

  // 대시보드 페이지로 이동 확인
  await expect(page).toHaveURL('https://inflearn.com/dashboard');
});
