import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './report',
  outputDir: './report/test-results',
  timeout: 30000,
  reporter: 'html',
  use: {
    headless: false,
    trace: 'on-first-retry',
    viewport: { width: 1920, height: 1080 },
    video: 'on',
    launchOptions: {
      slowMo: 500,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
