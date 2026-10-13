import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document, Schema as MongooseSchema } from "mongoose";

export type CallFeedbackDocument = CallFeedbackSchema & Document;

export const CALL_FEEDBACK_STATUSES = [
    "pending",
    "sent",
    "opened",
    "submitted",
    "failed",
    "failed_permanent",
    "skipped",
] as const;

@Schema({
    collection: "call_feedback",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

export class CallFeedbackSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop({ type: String, required: true, index: true })
    tenantUuid: String

    @Prop({ type: String, required: true })
    callUuid: String

    @Prop({ type: String, required: true, unique: true })
    token: String

    @Prop({ type: String, required: true, enum: CALL_FEEDBACK_STATUSES, default: "pending", index: true })
    status: String

    @Prop({ type: String })
    skipReason: String

    @Prop({ type: String })
    lastError: String

    @Prop({ type: Number, default: 0 })
    attempts: Number

    @Prop({ type: String })
    smsConfigId: String

    @Prop({ type: String })
    deliveryStatus: String

    @Prop({ type: MongooseSchema.Types.Mixed })
    formData: any

    @Prop({ type: Date })
    submittedAt: Date

    @Prop({ type: Date })
    openedAt: Date

    @Prop({ type: String })
    userAgent: String
}

export const callFeedbackSchema = SchemaFactory.createForClass(CallFeedbackSchema);

callFeedbackSchema.index({ tenantUuid: 1, callUuid: 1 }, { unique: true });
