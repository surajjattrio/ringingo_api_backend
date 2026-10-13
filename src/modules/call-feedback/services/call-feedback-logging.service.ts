import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CallFeedbackLogDocument, CallFeedbackLogSchema } from "../schema/call-feedback-log.schema";

const REDACTED = "[REDACTED]";
const MAX_BODY_BYTES = 4 * 1024;

// Any key whose name matches this is treated as a credential and never persisted, wherever it
// appears in a logged request/response (headers, query params, body fields, nested objects).
const SENSITIVE_KEY_PATTERN = /auth|token|secret|password|credential|api[-_]?key|bearer/i;

export interface WriteCallFeedbackLogInput {
    tenantUuid: string;
    feedbackId?: string;
    callUuid?: string;
    token?: string;
    stage: string;
    outcome: "success" | "failure" | "skipped";
    message?: string;
    request?: any;
    response?: any;
    durationMs?: number;
    error?: { message?: string; code?: string; stack?: string } | any;
    context?: any;
}

@Injectable()
export class CallFeedbackLoggingService {

    constructor(
        @InjectModel(CallFeedbackLogSchema.name) private readonly logModel: Model<CallFeedbackLogDocument>,
    ) { }

    /*
    @Usage : Write one call_feedback_logs row for a single stage transition. Never throws —
             a logging failure must not break the flow it's observing.
    */
    async writeLog(entry: WriteCallFeedbackLogInput): Promise<void> {
        try {
            const doc = {
                tenantUuid: entry.tenantUuid,
                feedbackId: entry.feedbackId,
                callUuid: entry.callUuid,
                token: entry.token,
                stage: entry.stage,
                outcome: entry.outcome,
                message: entry.message,
                request: this.sanitize(entry.request),
                response: this.sanitize(entry.response),
                durationMs: entry.durationMs,
                error: entry.error ? this.sanitize(entry.error) : undefined,
                context: this.sanitize(entry.context),
            };
            await new this.logModel(doc).save();
        } catch (error: any) {
            Logger.error(`Failed to write call_feedback_logs row for stage ${entry?.stage}: ${error?.message}`, "CallFeedbackLoggingService");
        }
    }

    /*
    @Usage : Chronological log timeline for the debug endpoint — every stage transition
             recorded for one feedback record.
    */
    async findTimeline(tenantUuid: string, feedbackId: string) {
        return this.logModel.find({ tenantUuid, feedbackId }).sort({ createdAt: 1 }).exec();
    }

    /*
    @Usage : Redact credential-shaped keys recursively, then truncate the resulting JSON if it's
             over 4KB. Applied to request/response/error/context before every write.
    */
    sanitize(value: any): any {
        if (value === undefined || value === null) return value;
        const redacted = this.redact(value);
        const serialized = JSON.stringify(redacted);
        if (serialized && Buffer.byteLength(serialized, "utf-8") > MAX_BODY_BYTES) {
            return {
                truncated: true,
                preview: serialized.slice(0, MAX_BODY_BYTES),
            };
        }
        return redacted;
    }

    private redact(value: any): any {
        if (Array.isArray(value)) {
            return value.map((item) => this.redact(item));
        }
        if (value && typeof value === "object") {
            const out: any = {};
            for (const [key, val] of Object.entries(value)) {
                out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : this.redact(val);
            }
            return out;
        }
        return value;
    }
}
