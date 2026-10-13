import * as winston from 'winston';
import 'winston-daily-rotate-file';

/*
@Usage : Registers process-wide uncaughtException/unhandledRejection capture into dated, rotated files.
         Call initVoiceBroadcastProcessLogger() exactly ONCE at app bootstrap (main.ts) - winston registers
         its own process.on('uncaughtException'/'unhandledRejection') handlers internally when
         exceptionHandlers/rejectionHandlers are set, so constructing this more than once would log every
         crash multiple times. These handlers are process-wide by nature (Node has no way to scope an
         uncaught exception handler to one module), so exceptions/rejections from anywhere in the app land
         here, not just voice-broadcast code - only the combined/error logs are voice-broadcast-specific.
         Kept as a separate logger (not the per-request voiceBroadcastWinstonLoggerConfig instance) because
         that config gets createLogger()'d fresh per consumer; exception/rejection handlers must be
         registered exactly once for the whole process.
*/

let initialized = false;

export function initVoiceBroadcastProcessLogger (): void {
    if ( initialized ) return;
    initialized = true;

    winston.createLogger( {
        transports: [],
        exceptionHandlers: [
            new winston.transports.DailyRotateFile( {
                filename: 'logs/voice-broadcast/exceptions-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxFiles: '15d',
            } ),
        ],
        rejectionHandlers: [
            new winston.transports.DailyRotateFile( {
                filename: 'logs/voice-broadcast/rejections-%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxFiles: '15d',
            } ),
        ],
    } );
}
