import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document, Schema as MongooseSchema } from "mongoose";

export type SmsProviderConfigDocument = SmsProviderConfigSchema & Document;

export const SMS_AUTH_TYPES = ["header", "query_param", "body_field", "basic", "bearer"] as const;
export const SMS_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH"] as const;

// Hard cap regardless of what a tenant configures — a stalled provider call must never
// hang the sweep past this, no matter what timeoutMs was saved.
export const SMS_PROVIDER_TIMEOUT_HARD_CAP_MS = 10000;
export const SMS_PROVIDER_DEFAULT_TIMEOUT_MS = 5000;

@Schema({
    collection: "sms_provider_configs",
    timestamps: true,
})

export class SmsProviderConfigSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop({ type: String, required: true, index: true })
    tenantUuid: String

    @Prop({ type: String, required: true })
    name: String

    @Prop({ type: Boolean, required: true, default: true })
    isActive: Boolean

    @Prop({ type: String, required: true })
    baseUrl: String

    @Prop({ type: String, enum: SMS_HTTP_METHODS, default: "POST" })
    method: String

    @Prop({ type: String, required: true, enum: SMS_AUTH_TYPES })
    authType: String

    // Encrypted (CommonFunctions.encode) JSON blob of provider credentials. Never returned
    // by any GET response — see SmsProviderConfigService.mask().
    @Prop({ type: String })
    credentials: String

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    headers: any

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    queryParams: any

    @Prop({ type: MongooseSchema.Types.Mixed, required: true })
    bodyTemplate: any

    // Names of the {{placeholder}} slots used in bodyTemplate, beyond the fixed {{to}},
    // {{senderId}}, {{templateId}} — same list also fills in `templateBody`'s {#var#}
    // placeholders for the save-time single-segment length check. One config = one
    // template, so there's only one variable list to keep in sync, not two.
    @Prop({ type: [String], default: [] })
    variables: string[]

    @Prop({ type: String, required: true })
    senderId: String

    // The Indian DLT registration this config sends — providerTemplateId is the
    // DLT/provider-side id, templateBody is the registered text (with `{#var#}`
    // placeholders) kept only for preview/length validation, never reassembled in code.
    // One config = one template per tenant, so there's no separate lookup key —
    // resolution is just { tenantUuid, isActive: true }.
    @Prop({ type: String, required: true })
    providerTemplateId: String

    @Prop({ type: String, required: true })
    templateBody: String

    @Prop({ type: Number, default: SMS_PROVIDER_DEFAULT_TIMEOUT_MS })
    timeoutMs: Number

    @Prop({
        type: MongooseSchema.Types.Mixed,
        default: () => ({ statusMin: 200, statusMax: 299 }),
    })
    successCondition: any

    @Prop({ type: String })
    messageIdPath: String
}

export const smsProviderConfigSchema = SchemaFactory.createForClass(SmsProviderConfigSchema);

smsProviderConfigSchema.index({ tenantUuid: 1, isActive: 1 });
