import { chromium } from '@playwright/test';

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class Recorder {
  static async startRecording(options: {
    url: string;
    outputFile: string;
    language: 'playwright-test' | 'javascript' | 'python' | 'java';
    headless: boolean;
  }) {
    const browser = await chromium.launch({ headless: options.headless });
    const context = await browser.newContext();

    // @ts-ignore
    await context._enableRecorder({
      language: options.language,
      mode: 'recording',
      outputFile: options.outputFile,
    });

    const page = await context.newPage();
    await page.goto(options.url);

    return {
      browser,
      context,
      page,
    };
  }
}
