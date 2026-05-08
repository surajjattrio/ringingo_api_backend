import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WebhookDeliveryLogDocument = WebhookDeliveryLog & Document;

@Schema({
    collection: "webhook_delivery_logs",
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
})
export class WebhookDeliveryLog {
    @Prop({ type: String, index: true })
    webhookUuid: string;

    @Prop({ type: String })
    webhookName: string;

    @Prop({ type: String, index: true })
    cdrUuid?: string;

    @Prop({ type: String, index: true })
    leadUuid?: string;

    @Prop({ type: String, enum: ['success', 'failed'], index: true })
    status: string;

    @Prop({ type: Number })
    statusCode: number;

    @Prop({ type: String })
    statusText: string;

    @Prop({ type: MongooseSchema.Types.Mixed })
    responseData: any;

    @Prop({ type: Number })
    attempt: number;

    @Prop({ type: Number })
    duration: number;

    @Prop({ type: Date, default: Date.now })
    timestamp: Date;
}

export const WebhookDeliveryLogSchema = SchemaFactory.createForClass(WebhookDeliveryLog);
