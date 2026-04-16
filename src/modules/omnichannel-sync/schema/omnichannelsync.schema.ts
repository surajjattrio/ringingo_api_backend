import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";

export type OmnichannelsyncDocument = OmnichannelsyncSchema & Document;

@Schema({
  collection: "omnichannel_sync",
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true },
})
export class OmnichannelsyncSchema {
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

  // Channel-specific identifiers (flexible object)
  @Prop({ type: Object })
  channel_identifiers: {
    // WhatsApp
    phone_number_id?: String;
    from_number?: String;

    // Instagram
    instagram_business_account_id?: String;
    instagram_page_id?: String;
  };

  // Contact identifier (normalized across channels)
  @Prop({ index: true })
  contact_identifier: String; // WhatsApp: phone number, Instagram: IGID

  @Prop()
  contact_name: String;

  // User & Tenant
  @Prop({ index: true })
  user_uuid: String; // assigned agent

  @Prop({ index: true })
  tenant_uuid: String;

  // Session metadata
  @Prop()
  browserToken: String;

  @Prop()
  platform: String; // 'web' | 'mobile' | 'desktop'

  @Prop({ default: "active" })
  status: String; // 'active' | 'closed' | 'transferred'

  // Transfer tracking
  @Prop()
  transfer_uuid: String;

  @Prop()
  transfer_username: String;

  @Prop()
  transfer_timestamp: Date;

  // Timestamps
  @Prop()
  last_message_at: Date;

  // WhatsApp specific fields (backward compatibility)
  @Prop()
  phone_number_id: String;

  @Prop()
  sender_igid?: String;

  @Prop()
  from_number: String;
}

let omnichannelsyncSchema = SchemaFactory.createForClass(OmnichannelsyncSchema);

omnichannelsyncSchema.virtual("user", {
  ref: UserSchema.name,
  localField: "user_uuid",
  foreignField: "uuid",
});

omnichannelsyncSchema.virtual("tenant", {
  ref: TenantSchema.name,
  localField: "tenant_uuid",
  foreignField: "uuid",
});

omnichannelsyncSchema.virtual("channel", {
  ref: MessagingChannelSchema.name,
  localField: "channel_uuid",
  foreignField: "uuid",
});

// Compound indexes for performance
omnichannelsyncSchema.index({
  channel_type: 1,
  contact_identifier: 1,
  status: 1,
});
omnichannelsyncSchema.index({ tenant_uuid: 1, user_uuid: 1 });
omnichannelsyncSchema.index({ channel_type: 1, channel_identifiers: 1 });

export { omnichannelsyncSchema };