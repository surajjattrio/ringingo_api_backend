import * as winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let msg = stack || message;

  if (msg === null) {
      msg = "null";
  } else if (typeof msg === 'object') {
    msg = JSON.stringify(msg, null, 2);
  }

  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level}]: ${msg}${metaStr}`;
});

/*
@Usage : File-based logging for the voice-broadcast module (dialer + auto-churn flows), following the same
         Winston/daily-rotate pattern already used for RabbitMQ logging (see winston-logger.config.ts).
         'combined' captures every level (debug/info/warn/error) - nothing is filtered out. 15-day retention,
         auto-deleted by winston-daily-rotate-file itself (maxFiles), no separate cron needed.
*/

export const voiceBroadcastWinstonLoggerConfig = {
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: 'logs/voice-broadcast/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '15d',
      level: 'debug',
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/voice-broadcast/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '15d',
      level: 'error',
    }),
    new winston.transports.Console({
      level: 'debug',
    }),
  ],
};
