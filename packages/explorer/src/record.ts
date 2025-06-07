import { Recorder } from './codegen/Recorder.js';
import logger from './logger.js';

export async function record(options: {
  url: string;
  outputFile?: string;
  language: 'playwright-test' | 'javascript' | 'python' | 'java';
  headless: boolean;
}) {
  try {
    const defaultOutputFile =
      options.outputFile ??
      `./preconditions/recording-${new Date().toISOString().replace(/[:.]/g, '-')}.spec.${options.language === 'python' ? 'py' : options.language === 'java' ? 'java' : 'js'}`;

    logger.info(
      `Starting recorder..
      URL: ${options.url}
      Output file: ${defaultOutputFile}
      Language: ${options.language ?? 'javascript'}
      Headless mode: ${options.headless ? 'enabled' : 'disabled'}
      
      Press Ctrl+C to stop recording
      `,
    );

    const { browser, context, page } = await Recorder.startRecording({
      ...options,
      outputFile: defaultOutputFile,
    });

    process.on('SIGINT', async () => {
      logger.info('Stopping recorder...');
      await browser.close();
      process.exit(0);
    });
  } catch (e) {
    logger.error('Error:', e);
    process.exit(1);
  }
}
