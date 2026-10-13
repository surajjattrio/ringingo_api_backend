import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document, Schema as MongooseSchema } from "mongoose";

export type CallFeedbackLogDocument = CallFeedbackLogSchema & Document;

export const CALL_FEEDBACK_LOG_STAGES = [
    "eligibility_checked",
    "feedback_created",
    "sms_config_resolved",
    "sms_api_request",
    "sms_api_response",
    "sms_send_failed",
    "sms_delivery_report",
    "link_opened",
    "link_rejected",
    "feedback_submitted",
    "submit_rejected",
] as const;

export const CALL_FEEDBACK_LOG_OUTCOMES = ["success", "failure", "skipped"] as const;

@Schema({
    collection: "call_feedback_logs",
    timestamps: { createdAt: true, updatedAt: false }
})

export class CallFeedbackLogSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop({ type: String, required: true, index: true })
    tenantUuid: String

    @Prop({ type: String, index: true })
    feedbackId: String

    @Prop({ type: String, index: true })
    callUuid: String

    @Prop({ type: String, index: true })
    token: String

    @Prop({ type: String, required: true, enum: CALL_FEEDBACK_LOG_STAGES })
    stage: String

    @Prop({ type: String, required: true, enum: CALL_FEEDBACK_LOG_OUTCOMES })
    outcome: String

    @Prop({ type: String })
    message: String

    @Prop({ type: MongooseSchema.Types.Mixed })
    request: any

    @Prop({ type: MongooseSchema.Types.Mixed })
    response: any

    @Prop({ type: Number })
    durationMs: Number

    @Prop({ type: MongooseSchema.Types.Mixed })
    error: any

    @Prop({ type: MongooseSchema.Types.Mixed })
    context: any
}

export const callFeedbackLogSchema = SchemaFactory.createForClass(CallFeedbackLogSchema);

callFeedbackLogSchema.index({ tenantUuid: 1, createdAt: -1 });
// Logs expire after 90 days — feedback records themselves are never TTL'd.
callFeedbackLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
