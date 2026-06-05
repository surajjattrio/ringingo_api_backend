import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { IvrSchema } from "src/modules/ivr/schema/ivr.schema";
import { RinggroupSchema } from "src/modules/ringgroup/schema/ringgroup.schema";
import { CallQueueSchema } from "src/modules/call-queue/schema/call-queue.schema";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { TelecomCircleSchema } from "src/modules/telecom-circle/schema/telecom-circle.schema";
import { TimeconditionSchema } from "src/modules/timecondition/schema/timecondition.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";
import { NotesSchema } from "src/modules/notes/schema/notes.schema";
import { VoiceBroadcastSchema } from "src/modules/voice-broadcast/schema/voice-broadcast.schema";

export type CdrsDocument = CdrsSchema & Document;

@Schema( { collection: "cdrs", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class CdrsSchema {
    @Prop({ index: true })
    createdAt: Date;

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    uuid: String

    @Prop({ index: true })
    user_uuid: String

    @Prop()
    extension_uuid: String

    @Prop({ index: true })
    tenant_uuid: String

    @Prop()
    trunk_uuid: String

    @Prop()
    sip_user: String

    @Prop()
    caller_id_name: String

    @Prop()
    destination_number: String

    @Prop()
    caller_id_number: String

    @Prop()
    billsecond: String

    @Prop()
    disposition: String

    @Prop()
    direction: String

    @Prop()
    call_type: String

    @Prop()
    callstart: String

    @Prop()
    recording_path: String

    @Prop()
    custom_callid: string

    @Prop()
    call_state: string

    @Prop()
    call_mode: String

    @Prop()
    phone_masking: String

    @Prop()
    lead_uuid: String

    @Prop()
    hangup_cause: String

    @Prop()
    transfer_to: String

    @Prop( { default: "" } )
    ivr_group: String

    @Prop( { default: "" } )
    pbx_feature_uuid: String

    @Prop()
    campaign_uuid: String

    @Prop()
    converted_date: String

    @Prop()
    wrap_up_time: String

    @Prop()
    wrap_up_time_duration: String

    @Prop()
    callend: String

    @Prop()
    hold_time: String

    @Prop()
    waiting_time: String

    @Prop()
    ringing_time: String

    @Prop()
    total_duration: String

    @Prop()
    disconnected_by_label: String

    @Prop()
    dial_method_label: String

    @Prop()
    agent: String

    @Prop({ type: Number, default: 0 })
    isSend: number;

    @Prop()
    is_csat: string;
    
    @Prop()
    actual_talktime: string;

}

let cdrsSchema = SchemaFactory.createForClass( CdrsSchema );
cdrsSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'extension', {
    ref: ExtensionSchema.name,
    localField: 'extension_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'lead_details', {
    ref: LeadManagementSchema.name,
    localField: 'lead_uuid',
    foreignField: 'lead_management_uuid',
} )
cdrsSchema.virtual( 'ivr', {
    ref: IvrSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'ringgroup', {
    ref: RinggroupSchema.name,
    localField: 'ivr_group',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'ring_group', {
    ref: RinggroupSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'call_queue', {
    ref: CallQueueSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'disposition_details', {
    ref: DispositionSchema.name,
    localField: 'hangup_cause',
    foreignField: 'disposition_uuid',
} )
cdrsSchema.virtual( 'telecom_circle', {
    ref: TelecomCircleSchema.name,
    localField: 'circle_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'outbound_campaign', {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'inbound_campaign', {
    ref: InboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'blended_campaign', {
    ref: BlendedCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'notes', {
    ref: NotesSchema.name,
    localField: 'custom_callid',
    foreignField: 'cdrs_uuid',
} )
cdrsSchema.virtual( 'time_condition', {
    ref: TimeconditionSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'voice_broadcast', {
    ref: VoiceBroadcastSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
} )
cdrsSchema.virtual( 'follow_up', {
    ref: 'FollowUpSchema',
    localField: 'lead_uuid',
    foreignField: 'lead_management_uuid',
} )
export { cdrsSchema }
