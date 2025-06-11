import winston from 'winston';
import path from 'node:path';
import * as process from "node:process";

const label = '[PLAYWRIGHT_MCP]';

const projectRoot = path.resolve(process.cwd(), '../../');
const logDir = process.env.MCP_LOG_DIR || path.join(projectRoot, 'logs');

const coloredLabel = process.env.NODE_ENV === 'development' ? `\x1b[48;5;194;30m${label}\x1b[0m` : label;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.label({
      label: coloredLabel,
    }),
    winston.format.timestamp({
      format: 'YY-MM-DD HH:mm:ss',
    }),
    winston.format.printf((info) => {
      // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
      const level = process.env.NODE_ENV === 'development' ? info.level : info.level.replace(/\x1b\[[0-9;]*m/g, '');
      return ` ${info.timestamp} ${info.label} ${level} : ${info.message}`;
    }),
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'playwright-mcp.log'),
    }),
    ...(process.env.NODE_ENV === 'development' ? [new winston.transports.Console()] : []),
  ],
});

export default logger;
