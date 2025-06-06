import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { type Connection, createConnection } from '@playwright/mcp';
import * as process from "node:process";

interface PlaywrightConfig {
  browserName: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  isolated: boolean;
  saveTrace: boolean;
  tracesDir?: string;
  userDataDir?: string;
  outputDir?: string;
}

export class PlaywrightServer {
  private static instance: PlaywrightServer | null = null;
  private readonly defaultConfig: PlaywrightConfig;
  private readonly connections: {
    id: string;
    connection: Connection;
  }[] = [];

  private constructor(defaultConfig: PlaywrightConfig) {
    this.defaultConfig = defaultConfig;
  }

  static init(
    defaultConfig: PlaywrightConfig = {
      browserName: 'chromium',
      headless: true,
      isolated: true,
      saveTrace: false,
    },
  ): PlaywrightServer {
    if (!PlaywrightServer.instance) {
      PlaywrightServer.instance = new PlaywrightServer(defaultConfig);
    }

    PlaywrightServer.instance.setupExitWatchdog();
    return PlaywrightServer.instance;
  }

  static getInstance(): PlaywrightServer {
    if (!PlaywrightServer.instance) {
      throw new Error('PlaywrightServer instance not initialized. Please call PlaywrightServer.init() first.');
    }
    return PlaywrightServer.instance;
  }

  async createConnection(id: string, config: PlaywrightConfig) {
    const connection = await createConnection({
      ...this.defaultConfig,
      browser: {
        browserName: config.browserName,
        isolated: config.isolated,
        launchOptions: {
          headless: config.headless,
          tracesDir: config.tracesDir ? `${config.tracesDir}/${id}` : undefined,
        },
        userDataDir: config.userDataDir ? `${config.userDataDir}/${id}` : undefined,
      },
      saveTrace: config.saveTrace,
      outputDir: config.outputDir ? `${config.outputDir}/${id}` : undefined,
    });

    const transport = new StdioServerTransport(process.stdin, process.stdout);
    await connection.server.connect(transport);

    this.connections.push({ id, connection });

    return connection;
  }

  async closeConnection(id: string) {
    const index = this.connections.findIndex((conn) => conn.id === id);
    if (index === -1) {
      throw new Error(`Connection with id ${id} not found`);
    }
    const { connection } = this.connections[index];
    await connection.close();
    this.connections.splice(index, 1);
  }

  setupExitWatchdog() {
    let isExiting = false;
    const handleExit = async () => {
      if (isExiting) return;
      isExiting = true;
      setTimeout(() => process.exit(0), 15000);
      await Promise.all(this.connections.map((connection) => connection.connection.close()));
      process.exit(0);
    };

    process.stdin.on('close', handleExit);
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  }
}
