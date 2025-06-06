import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { app, BrowserWindow, ipcMain } from 'electron';
import type { AppRouter } from 'explorer';
import logger from './logger.js';

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
  domainContext: string[];
}

let mainWindow: BrowserWindow | null = null;
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
let explorerServer: any = null;

const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000',
    }),
  ],
});

async function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  explorerServer = spawn('node', ['dist/server.js'], {
    cwd: path.resolve(__dirname, '../node_modules/explorer'),
    stdio: 'inherit',
  });

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  mainWindow.loadFile('./static/index.html');

  // Always open DevTools for debugging
  mainWindow.webContents.openDevTools();
}

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
  try {
    const result = await trpc.explore.mutate({
      scenario: testData.scenario,
      baseUrl: testData.baseUrl,
      inputs: testData.userInputs,
      apiKey: testData.apiKey,
      domainContext: testData.domainContext,
      browserOptions: {
        headless: false,
        browser: 'chromium',
      },
    });
    logger.info('Test result:', result);

    return result;
  } catch (error) {
    logger.error('Error running test:', error);
    throw error;
  }
}

app.whenReady().then(() => {
  // Register IPC handler for test execution
  ipcMain.handle('run-test', async (_, testData: TestData) => {
    try {
      return await runTest(testData);
    } catch (error) {
      logger.error('Error in run-test handler:', error);
      throw error;
    }
  });

  // Register IPC handler for clearing browser cache
  ipcMain.handle('clear-browser-cache', async () => {
    try {
      const browserDataPath = path.join(process.cwd(), 'browser-data');
      await fs.rm(browserDataPath, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      logger.error('Error clearing browser cache:', error);
      throw error;
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (explorerServer) {
    explorerServer.kill();
  }
});
