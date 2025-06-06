import winston from 'winston';

const label = '[ELECTRON_CLIENT]';

const alignColorsAndTime = winston.format.combine(
  winston.format.label({
    label: `\x1b[48;5;224;30m${label}\x1b[0m`,
  }),
  winston.format.timestamp({
    format: 'YY-MM-DD HH:mm:ss',
  }),
  winston.format.colorize({ level: true }),
  winston.format.printf((info) => ` ${info.timestamp} ${info.label} ${info.level} : ${info.message}`),
);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(alignColorsAndTime),
  transports: [new winston.transports.Console()],
});

export default logger;
