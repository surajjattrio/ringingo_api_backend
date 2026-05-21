import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from "crypto";
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WebhookConfigDocument = WebhookConfig & Document;

@Schema({
    collection: "web_hook",
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
})
export class WebhookConfig {
    @Prop({
        type: String,
        default: () => randomUUID(),
        required: true,
        unique: true,
        index: true
    })
    uuid: string;

    @Prop({ type: String })
    name?: string;

    @Prop({ type: String })
    webhook_url?: string;

    @Prop({ type: String, index: true })
    webhook_type?: string;

    @Prop({ type: String, default: "POST" })
    method?: string;

    @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
    headers?: Record<string, string>;

    @Prop({ type: Number, default: 30000 })
    timeout?: number;

    @Prop({ type: Number, default: 1 })
    max_retries?: number;

    @Prop({ type: Number, default: 2000 })
    retry_delay?: number;

    @Prop({ type: Boolean, default: true })
    is_active?: boolean;

    @Prop({ type: String, index: true })
    tenant_uuid?: string;

    @Prop({ type: String, default: null })
    bearer_token?: string;
}

export const WebhookConfigSchema = SchemaFactory.createForClass(WebhookConfig);
