import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type OmniChannelReportDocument =
  OmniChannelReportSchema & Document;

@Schema({
  collection: "omni_channel_report",
  timestamps: true,
})
export class OmniChannelReportSchema {
  @Prop({
    type: String,
    default: () => randomUUID(),
    unique: true,
  })
  uuid: string;

  // Tenant
  @Prop({ required: true })
  tenant_uuid: string;

  // Agent / User
  @Prop({ required: true })
  user_uuid: string;

  // @Prop({ required: true })
  // user_name: string; // user2, user99, etc.

  // Customer
  // @Prop()
  // customer_name: string;

  @Prop()
  lead_management_uuid: string;

  @Prop({ required: true })
  phone_number: string;

  // Chat details
  @Prop({
    enum: ["WhatsApp", "instagram", "facebook"],
    required: true,
  })
  channel_type: string;

  // @Prop()
  // campaign_type: string;

  @Prop()
  campaign_uuid: string;

  // Status (used for Active / Inactive cards)
  // @Prop({
  //   enum: ["active", "inactive"],
  //   default: "active",
  // })
  // chat_status: string;

  // Date shown in table
  // @Prop({ type: Date, required: true })
  // chat_date: Date;
}

export const omniChannelReportSchema =
  SchemaFactory.createForClass(OmniChannelReportSchema);

  
// USER
omniChannelReportSchema.virtual("user", {
  ref: UserSchema.name,
  localField: "user_uuid",
  foreignField: "uuid",
  justOne: true,
});

// TENANT
omniChannelReportSchema.virtual("tenant", {
  ref: TenantSchema.name,
  localField: "tenant_uuid",
  foreignField: "uuid",
  justOne: true,
});

// CAMPAIGN
omniChannelReportSchema.virtual("blended_campaign", {
  ref: BlendedCampaignSchema.name,
  localField: "campaign_uuid",
  foreignField: "uuid",
  justOne: true,
});

// LEAD MANAGEMENT
omniChannelReportSchema.virtual("lead_management", {
  ref: LeadManagementSchema.name,
  localField: "lead_management_uuid",
  foreignField: "lead_management_uuid",
  justOne: true,
});