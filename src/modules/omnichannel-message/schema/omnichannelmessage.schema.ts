import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";

export type OmnichannelmessageDocument = OmnichannelmessageSchema & Document;

@Schema({
  collection: "omnichannelmessage",
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class OmnichannelmessageSchema {
  @Prop({
    type: String,
    default: function radomUUID() {
      return randomUUID();
    },
    unique: true,
  })
  uuid: string;

  // Channel identification
  @Prop({ required: true, index: true })
  channel_type: String; // 'whatsapp' | 'instagram' | 'facebook' | 'webchat' | 'sms'

  @Prop()
  channel_uuid: String; // reference to messaging_channel

  // Provider-specific message ID (for idempotency)
  @Prop({ index: true, unique: true, sparse: true })
  provider_message_id: String; // WhatsApp: wamid.xxx, Instagram: mid.xxx

  // Channel-specific identifiers (flexible object)
  @Prop({ type: Object })
  channel_identifiers: {
    // WhatsApp
    phone_number_id?: String;
    whatsapp_business_account_id?: String;

    // Instagram
    instagram_business_account_id?: String;
    instagram_page_id?: String;
    sender_igid?: String;
    recipient_igid?: String;
  };

  // Participants (normalized)
  @Prop({ index: true })
  from_number: String; // WhatsApp: phone number, Instagram: IGID, Facebook: PSID

  @Prop()
  to: String; // recipient identifier

  // Message content
  @Prop()
  direction: String; // 'inbound' | 'outbound'

  @Prop()
  text_content: String;

  @Prop()
  text_type: String; // 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker'

  // Attachments
  @Prop({ type: [String] })
  image_url: String[];

  @Prop({ type: [String] })
  document_url: String[];

  @Prop()
  media_url: String; // Generic media URL for Instagram/Facebook

  @Prop({ type: Object })
  attachments: Array<{
    type: String;
    url: String;
    filename: String;
    mime_type: String;
    provider_media_id: String;
  }>;

  // Message metadata
  @Prop()
  message_id: String; // internal reference (deprecated, use provider_message_id)

  @Prop()
  message_type: String; // "0" = sent, "1" = received (for backward compatibility)

  @Prop()
  timestamp: String;

  // Status tracking
  @Prop()
  status: String; // 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

  @Prop()
  notification_type: String; // "0" = sent, "1" = delivered, "2" = read (backward compatibility)

  @Prop()
  status_updated_at: Date;

  @Prop()
  error_code: String;

  @Prop()
  error_message: String;

  // User & Tenant
  @Prop()
  user_uuid: String; // assigned agent

  @Prop({ index: true })
  tenant_uuid: String;

  // Queue & Channel assignment
  @Prop()
  messaging_channel_uuid: String; // same as channel_uuid (backward compatibility)

  @Prop()
  messaging_queue_uuid: String;

  // Templates (WhatsApp/RCS)
  @Prop({ type: Object })
  template_name: String;

  @Prop()
  template_language_code: String;

  @Prop({ type: Object })
  template_parameters: Object;

  // CRM integration
  @Prop()
  lead_management_uuid: String;

  @Prop()
  name: String; // contact name

  // Unread tracking
  @Prop()
  unread_message: String; // "0" or "1" (backward compatibility)

  @Prop({ default: false })
  is_unread: Boolean;

  @Prop()
  read_at: Date;

  // Transfer tracking
  @Prop()
  transfer_uuid: String;

  @Prop()
  transfer_username: String;

  @Prop()
  converted_date: String;

  // WhatsApp specific (backward compatibility)
  @Prop()
  phone_number_id: String;

  @Prop()
  whatsapp_business_account_id: String;

  // @Prop()
  // whatsapp_messaging_channel_uuid: String;

  // Raw payload for debugging
  @Prop({ type: Object })
  raw_payload: Object;
}

let omnichannelmessageSchema = SchemaFactory.createForClass(
  OmnichannelmessageSchema
);

omnichannelmessageSchema.virtual("user", {
  ref: UserSchema.name,
  localField: "user_uuid",
  foreignField: "uuid",
});

omnichannelmessageSchema.virtual("tenant", {
  ref: TenantSchema.name,
  localField: "tenant_uuid",
  foreignField: "uuid",
});

omnichannelmessageSchema.virtual("messaging_channel", {
  ref: MessagingChannelSchema.name,
  localField: "messaging_channel_uuid",
  foreignField: "uuid",
});

omnichannelmessageSchema.virtual("messaging_queue", {
  ref: MessagingQueueSchema.name,
  localField: "messaging_queue_uuid",
  foreignField: "uuid",
});

// Compound indexes for performance
omnichannelmessageSchema.index({
  channel_type: 1,
  from_number: 1,
  tenant_uuid: 1,
});
omnichannelmessageSchema.index({ user_uuid: 1, is_unread: 1 });
omnichannelmessageSchema.index({ tenant_uuid: 1, messaging_queue_uuid: 1 });
omnichannelmessageSchema.index({ timestamp: -1 });

export { omnichannelmessageSchema };