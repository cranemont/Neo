import { Recorder } from './codegen/Recorder.js';

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

    console.log('Starting recorder...');
    console.log(`URL: ${options.url}`);
    console.log(`Output file: ${defaultOutputFile}`);
    console.log(`Language: ${options.language ?? 'javascript'}`);
    console.log(`Headless mode: ${options.headless ? 'enabled' : 'disabled'}`);
    console.log('\nPress Ctrl+C to stop recording\n');

    const { browser, context, page } = await Recorder.startRecording({
      ...options,
      outputFile: defaultOutputFile,
    });

    process.on('SIGINT', async () => {
      console.log('\nStopping recorder...');
      await browser.close();
      process.exit(0);
    });
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
