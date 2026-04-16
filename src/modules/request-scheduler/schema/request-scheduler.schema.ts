import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";
import { BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { IvrSchema } from "src/modules/ivr/schema/ivr.schema";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { NotesSchema } from "src/modules/notes/schema/notes.schema";
import { RinggroupSchema } from "src/modules/ringgroup/schema/ringgroup.schema";
import { TelecomCircleSchema } from "src/modules/telecom-circle/schema/telecom-circle.schema";
import { TimeconditionSchema } from "src/modules/timecondition/schema/timecondition.schema";
import { VoiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type RequestSchedulerDocument = RequestSchedulerSchema & Document;

@Schema({ collection: "request_scheduler", timestamps: true })
export class RequestSchedulerSchema {

  @Prop({
    type: String,
    default: () => randomUUID(),
    unique: true,
  })
  uuid: string;

  @Prop({})
  name: string;

  @Prop({})
  tenant_uuid: string;

  @Prop({})
  disposition: string;

  // ✅ Required Date Range
  @Prop({})
  callstart: string;

  @Prop({})
  callend: string;

  // ✅ Request status
  @Prop({
    type: String,
    enum: ["pending", "inprogress", "completed", "failed"],
    default: "pending",
  })
  request_status: string;

  @Prop({
    type: String,
    enum: ["pending", "inprogress", "completed", "failed"],
    default: "pending",
  })
  bulk_status: string;

  @Prop({ default: "" })
  bulk_path: string;

  @Prop({ default: "no", enum: ["yes", "no"] })
  bulk_download: string;

  @Prop({ default: "no", enum: ["yes", "no"] })
  quarter_selected: string;

  // =====================================================
  // ✅ Store your advanced-search filters here
  // example: caller_id_name|1, direction|4, user_uuid|4 etc.
  // =====================================================

  @Prop({ type: Object, default: {} })
  // filters: Object;
  filters: Record<string, any>;

  // ================================
  // CSV Result Info
  // ================================

  @Prop({ default: "" })
  csv_path: string;

  @Prop({ default: "" })
  baseUrl: string;
  
  @Prop({ default: 0 })
  total_rows: number;

  @Prop({ default: 0 })
  total_recordings: number;

  @Prop({ default: "" })
  error_message: string;

  // ✅ Field Mapping Snapshot (system_field -> client_header)
  @Prop({ type: Object })
  mapping: Record<string, string>;
}

const requestSchedulerSchema = SchemaFactory.createForClass(RequestSchedulerSchema);

requestSchedulerSchema.virtual('user', {
  ref: UserSchema.name,
  localField: 'user_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('extension', {
  ref: ExtensionSchema.name,
  localField: 'extension_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('tenant', {
  ref: TenantSchema.name,
  localField: 'tenant_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('lead_details', {
  ref: LeadManagementSchema.name,
  localField: 'lead_uuid',
  foreignField: 'lead_management_uuid',
})
requestSchedulerSchema.virtual('ivr', {
  ref: IvrSchema.name,
  localField: 'pbx_feature_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('ringgroup', {
  ref: RinggroupSchema.name,
  localField: 'ivr_group',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('ring_group', {
  ref: RinggroupSchema.name,
  localField: 'pbx_feature_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('call_queue', {
  ref: CallQueueSchema.name,
  localField: 'pbx_feature_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('disposition_details', {
  ref: DispositionSchema.name,
  localField: 'disposition',
  foreignField: 'disposition_uuid',
})
requestSchedulerSchema.virtual('telecom_circle', {
  ref: TelecomCircleSchema.name,
  localField: 'circle_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('outbound_campaign', {
  ref: OutboundCampaignSchema.name,
  localField: 'campaign_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('inbound_campaign', {
  ref: InboundCampaignSchema.name,
  localField: 'campaign_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('blended_campaign', {
  ref: BlendedCampaignSchema.name,
  localField: 'campaign_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('notes', {
  ref: NotesSchema.name,
  localField: 'custom_callid',
  foreignField: 'cdrs_uuid',
})
requestSchedulerSchema.virtual('time_condition', {
  ref: TimeconditionSchema.name,
  localField: 'pbx_feature_uuid',
  foreignField: 'uuid',
})
requestSchedulerSchema.virtual('voice_broadcast', {
  ref: VoiceBroadcastSchema.name,
  localField: 'campaign_uuid',
  foreignField: 'uuid',
})

export { requestSchedulerSchema }