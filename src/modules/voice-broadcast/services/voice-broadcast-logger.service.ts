import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { voiceBroadcastWinstonLoggerConfig } from "src/logger/voice-broadcast-winston-logger.config";
import { getVoiceBroadcastLogContext, VoiceBroadcastLogContext } from "../utils/voice-broadcast-log-context";

/*
@Usage : Structured, correlated, file-based logging for the voice-broadcast dialer + auto-churn flows.
         Writes to logs/voice-broadcast/{combined,error}-<date>.log via winston-daily-rotate-file
         (15-day retention, auto-deleted - see voice-broadcast-winston-logger.config.ts), following the
         same pattern already used for RabbitMQ logging (src/logger/winston-logger.config.ts).
         run_id/tenant_uuid/voice_broadcast_uuid/lead_management_uuid are read from the current
         runWithVoiceBroadcastLogContext() context and merged with any explicit overrides passed in, so every
         line from one flow (a request or a dial session) can be grepped out of the file by its run_id.
         Never throws — a logging failure must never break the dialer or the request it's logging.
*/

@Injectable()
export class VoiceBroadcastLoggerService {

    private readonly winstonLogger: LoggerService = WinstonModule.createLogger( voiceBroadcastWinstonLoggerConfig );

    private emit ( level: "debug" | "log" | "warn" | "error", event: string, message: string, detail: any = {}, overrides: Partial<VoiceBroadcastLogContext> = {} ) {
        try {
            const ctx = { ...getVoiceBroadcastLogContext(), ...overrides };
            const meta = { event, run_id: ctx.run_id, tenant_uuid: ctx.tenant_uuid, voice_broadcast_uuid: ctx.voice_broadcast_uuid, lead_management_uuid: ctx.lead_management_uuid, detail };

            switch ( level ) {
                case "debug": this.winstonLogger.debug( message, meta ); break;
                case "warn": this.winstonLogger.warn( message, meta ); break;
                case "error": this.winstonLogger.error( message, meta ); break;
                default: this.winstonLogger.log( message, meta ); break;
            }
        } catch ( err: any ) {
            Logger.error( `voice-broadcast-logger failed for event : ${event}`, err?.message );
        }
    }

    debug ( event: string, message: string, detail?: any, overrides?: Partial<VoiceBroadcastLogContext> ) { this.emit( "debug", event, message, detail, overrides ); }
    info ( event: string, message: string, detail?: any, overrides?: Partial<VoiceBroadcastLogContext> ) { this.emit( "log", event, message, detail, overrides ); }
    warn ( event: string, message: string, detail?: any, overrides?: Partial<VoiceBroadcastLogContext> ) { this.emit( "warn", event, message, detail, overrides ); }
    error ( event: string, message: string, detail?: any, overrides?: Partial<VoiceBroadcastLogContext> ) { this.emit( "error", event, message, detail, overrides ); }
}
