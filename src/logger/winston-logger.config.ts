import * as winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let msg = stack || message;
  
  if (msg === null) {
      msg = "null";
  } else if (typeof msg === 'object') {
    msg = JSON.stringify(msg, null, 2);
  }
  
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  // Added [DEBUG_MSG] to see the raw message
  return `${timestamp} [${level}]: ${msg}${metaStr} | RAW: ${JSON.stringify(message)}`;
});

export const winstonLoggerConfig = {
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    // Combined logs file with daily rotation
    new winston.transports.DailyRotateFile({
      filename: 'logs/rmq/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
    }),
    // Error logs file with daily rotation
    new winston.transports.DailyRotateFile({
      filename: 'logs/rmq/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    }),
  ],
};
