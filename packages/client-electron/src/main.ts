import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interface for test data received from renderer
interface TestData {
  scenario: string;
  baseUrl: string;
  userInputs: {
    key: string;
    value: string;
    description: string;
  }[];
  apiKey: string;
  domainContext: Record<string, string>;
}

const createWindow = () => {
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Loading preload script from:', preloadPath);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  win.loadFile('./static/index.html');

  // Always open DevTools for debugging
  win.webContents.openDevTools();
};

// Interface for test result
interface TestResult {
  id: string;
  status: 'SUCCESS' | 'FAILURE';
  description: string;
  playwrightCodes: string[];
  playwrightAssertion?: string;
}

// Handle test execution
async function runTest(testData: TestData): Promise<TestResult> {
  return new Promise((resolve, reject) => {
    try {
      // Spawn explorer process
      console.log(
        testData.userInputs.flatMap((input) => ['--input', `"${input.key}","${input.value}","${input.description}"`]),
      );
      const explorerProcess = spawn('node', [
        path.resolve(process.cwd(), 'node_modules/explorer/dist/main.js'),
        '--scenario',
        testData.scenario,
        '--url',
        testData.baseUrl,
        '--api-key',
        testData.apiKey,
        ...testData.userInputs.flatMap((input) => ['--input', `${input.key},${input.value},${input.description}`]),
        ...Object.entries(testData.domainContext).flatMap(([key, value]) => ['--domain-context', `${key},${value}`]),
      ]);

      let stdoutData = '';
      let stderrData = '';

      explorerProcess.stdout.on('data', (data) => {
        console.log('Explorer stdout:', data.toString());
        stdoutData += data.toString();
      });

      explorerProcess.stderr.on('data', (data) => {
        console.error('Explorer stderr:', data.toString());
        stderrData += data.toString();
      });

      explorerProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Explorer process exited with code ${code}`);
          console.error(`stderr: ${stderrData}`);
          reject(new Error(`Explorer process failed with code ${code}: ${stderrData}`));
          return;
        }

        try {
          // Parse the JSON result from stdout
          const result = stdoutData.match(/```result\n([\s\S]*?)\n```/);
          if (result?.[1]) {
            resolve(JSON.parse(result[1].trim()));
          } else {
            console.error('No valid result found in explorer output');
            reject(new Error('No valid result found in explorer output'));
          }
        } catch (error) {
          console.error('Failed to parse explorer output:', error);
          // @ts-ignore
          reject(new Error(`Failed to parse explorer output: ${error.message}`));
        }
      });
    } catch (error) {
      console.error('Error running test:', error);
      reject(error);
    }
  });
}

app.whenReady().then(() => {
  // Register IPC handler for test execution
  ipcMain.handle('run-test', async (_, testData: TestData) => {
    try {
      return await runTest(testData);
    } catch (error) {
      console.error('Error in run-test handler:', error);
      throw error;
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
