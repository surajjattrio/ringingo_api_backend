import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Document } from 'mongoose';

export type GoogleCredentialDocument = GoogleCredential & Document;

@Schema({ collection: 'google_credentials', timestamps: true })
export class GoogleCredential extends Document {
    @Prop({ type: String, default: () => randomUUID(), unique: true })
    uuid: string;

    @Prop()
    tenant_uuid: string;

    @Prop({ required: true })
    client_id: string;

    @Prop({ required: true })
    client_email: string;

    @Prop({ required: true })
    private_key: string;

    @Prop({ required: true })
    scopes: string; // space-separated or single scope

    @Prop({ required: true })
    sheet_id: string;

    @Prop({ required: true })
    range: string;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ type: String, required: false })
    access_token?: string;

    @Prop({ type: String, required: false })
    refresh_token?: string;

    @Prop({ type: Date, required: false })
    token_expiry?: Date;
}

export const GoogleCredentialSchema = SchemaFactory.createForClass(GoogleCredential);
