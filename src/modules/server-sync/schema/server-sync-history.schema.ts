import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type ServerSyncHistoryDocument = ServerSyncHistorySchema & Document;

@Schema({ collection: "server_sync_history", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })
export class ServerSyncHistorySchema {
    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: string;

    @Prop({ type: String, default: function genUUID() { return randomUUID(); } })
    sync_id: string;

    @Prop({ type: String, required: true })
    source_server: string;

    @Prop({ type: String, required: true })
    target_server: string;

    @Prop({ type: [String], default: [] })
    selected_modules: string[];

    @Prop({ type: String, default: "SKIP" }) // SKIP, UPDATE, OVERWRITE
    duplicate_strategy: string;

    @Prop({ type: String, default: "IN_PROGRESS" }) // IN_PROGRESS, COMPLETED, FAILED, PARTIAL_SUCCESS
    status: string;

    @Prop({
        type: Object,
        default: {
            total: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
        },
    })
    summary: {
        total: number;
        created: number;
        updated: number;
        skipped: number;
        failed: number;
    };

    @Prop({ type: Object, default: {} })
    module_stats: Record<string, {
        total: number;
        created: number;
        updated: number;
        skipped: number;
        failed: number;
        status: string;
        errors: Array<{ recordId?: string; recordName?: string; reason: string }>;
    }>;

    @Prop({
        type: [
            {
                timestamp: { type: Date, default: Date.now },
                module: { type: String },
                level: { type: String, default: "INFO" }, // INFO, WARN, ERROR, SUCCESS
                message: { type: String },
            },
        ],
        default: [],
    })
    logs: Array<{
        timestamp: Date;
        module?: string;
        level: string;
        message: string;
    }>;

    @Prop({ type: Date, default: Date.now })
    started_at: Date;

    @Prop({ type: Date })
    completed_at: Date;

    @Prop({ type: String, default: "" })
    triggered_by: string;

    @Prop({ type: String, default: "" })
    tenant_uuid?: string;
}

export const serverSyncHistorySchema = SchemaFactory.createForClass(ServerSyncHistorySchema);
