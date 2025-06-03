import { test } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('https://naver.com');
  await page.getByRole('textbox').fill('Hello World');
  await page.getByRole('button', { name: 'Search' }).click();
});
