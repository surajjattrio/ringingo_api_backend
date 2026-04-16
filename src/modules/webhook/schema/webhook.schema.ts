import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from "crypto";
import { Document, Schema as MongooseSchema } from 'mongoose';

export type WebhookDocument = Webhook & Document;

@Schema({
    collection: "webhook",
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true }
})
export class Webhook {
    @Prop({
        type: String,
        default: () => randomUUID(),
        required: true,
        unique: true,
        index: true
    })
    uuid: string;

    @Prop({ type: Number, default: 0 })
    isSend: number;

    @Prop({ type: String })
    lead_uuid?: string;

    @Prop({ type: String, index: true, unique: true })
    reference_id?: string;

    @Prop({ type: Number, default: 0 })
    retryCount: number;

    @Prop({
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending"
    })
    status: string;

    @Prop({ type: Number, default: null })
    response_code?: number;

    @Prop({ type: String, default: null })
    response_status?: string;

    @Prop({ type: String, default: null })
    response?: string;

    @Prop({ type: MongooseSchema.Types.Mixed, default: null })
    shareData?: Record<string, any>;
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);