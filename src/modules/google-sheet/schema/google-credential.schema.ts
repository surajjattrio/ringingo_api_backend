import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Document } from 'mongoose';

export type GoogleCredentialDocument = GoogleCredential & Document;

@Schema({
    collection: 'google_credentials',
    timestamps: true,
})

export class GoogleCredential extends Document {
    @Prop({ type: String, default: () => randomUUID(), unique: true, index: true })
    uuid: string;

    @Prop({ type: String, required: false, index: true })
    tenant_uuid: string;

    // ---------- Google Sheet Service Account ----------

    @Prop({ type: String, required: true })
    type: string;

    @Prop({ type: String, required: true })
    project_id: string;

    @Prop({ type: String, required: true })
    private_key_id: string;

    @Prop({ type: String, required: true })
    private_key: string;

    @Prop({ type: String, required: true, index: true })
    client_email: string;

    @Prop({ type: String, required: true })
    client_id: string;

    @Prop({ type: String, required: true })
    auth_uri: string;

    @Prop({ type: String, required: true })
    token_uri: string;

    @Prop({ type: String, required: true })
    auth_provider_x509_cert_url: string;

    @Prop({ type: String, required: true })
    client_x509_cert_url: string;

    @Prop({ type: String, required: false })
    universe_domain: string;

    // ---------- Google Sheet Config ----------

    @Prop({ type: String, required: true, index: true })
    sheet_id: string;

    @Prop({ type: String, required: true })
    range: string;

    @Prop({ type: String, required: true })
    scopes: string;

    @Prop({ type: Number, default: 3600 })
    cache_ttl: number;

    @Prop({ type: String, default: '', index: true })
    cache_key: string;

    @Prop({ type: Number, default: 300000 })
    timeout_ms: number;

    @Prop({ type: Number, default: 3 })
    max_retries: number;

    @Prop({ type: Number, default: 1000 })
    chunk_size: number;

    @Prop({ type: Number, default: 100000 })
    max_total_rows: number;

    @Prop({ type: Boolean, default: false })
    filter_today: boolean;

    @Prop({ type: Number, default: 7 })
    date_column_index: number;

    // ---------- OAuth Credentials ----------

    @Prop({ type: String, required: false, index: true })
    google_client_id?: string;

    @Prop({ type: String, required: false })
    google_client_secret?: string;

    @Prop({ type: String, required: false })
    refresh_token?: string;

    // ---------- Runtime Tokens ----------

    @Prop({ type: String, required: false })
    access_token?: string;

    @Prop({ type: Date, required: false })
    token_expiry?: Date;

    // ---------- Status ----------

    @Prop({ type: Boolean, default: true, index: true })
    isActive: boolean;
}

export const GoogleCredentialSchema = SchemaFactory.createForClass(GoogleCredential);

// ---------- Single Indexes ----------

GoogleCredentialSchema.index({ uuid: 1 }, { unique: true });
GoogleCredentialSchema.index({ tenant_uuid: 1 });
GoogleCredentialSchema.index({ sheet_id: 1 });
GoogleCredentialSchema.index({ isActive: 1 });
GoogleCredentialSchema.index({ token_expiry: 1 });
GoogleCredentialSchema.index({ createdAt: -1 });

// ---------- Compound Indexes ----------

// Fast active credential lookup per tenant
GoogleCredentialSchema.index({
    tenant_uuid: 1,
    isActive: 1,
});

// Fast tenant credential listing
GoogleCredentialSchema.index({
    tenant_uuid: 1,
    createdAt: -1,
});

// Fast Google Sheet lookup within tenant
GoogleCredentialSchema.index({
    tenant_uuid: 1,
    sheet_id: 1,
});

// Prevent duplicate Google Sheet configuration per tenant
GoogleCredentialSchema.index(
    {
        tenant_uuid: 1,
        sheet_id: 1,
    },
    {
        unique: true,
    },
);

// Fast token expiry checks
GoogleCredentialSchema.index({
    tenant_uuid: 1,
    token_expiry: 1,
});

// Fast active sheet integrations
GoogleCredentialSchema.index({
    tenant_uuid: 1,
    isActive: 1,
    sheet_id: 1,
});