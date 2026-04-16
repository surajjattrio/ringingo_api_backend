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

export type DropCallsDocument = DropCallsSchema & Document;

@Schema({ collection: "drop_calls", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })
export class DropCallsSchema {
    @Prop({ index: true })
    createdAt: Date;

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
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
    billsecond: Number

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
    pbx_feature: String

    @Prop()
    pbx_feature_uuid: String

    @Prop()
    authentication_type: String

    @Prop()
    custom_callid: String

    @Prop()
    ip_map_uuid: String

    @Prop()
    call_state: String

    @Prop()
    lead_uuid: String

    @Prop()
    campaign_uuid: String

    @Prop()
    call_mode: String

    @Prop()
    hangup_cause: String

    @Prop({ default: "" })
    ivr_group: String

    @Prop()
    disconnected_by: String

    @Prop()
    circle_uuid: String

    @Prop()
    callend: String

    @Prop()
    hold_time: Number

    @Prop()
    waiting_time: Number

    @Prop()
    ringing_time: Number

    @Prop()
    total_duration: Number

    @Prop()
    ivr_feedback_score: String
}

let dropCallsSchema = SchemaFactory.createForClass(DropCallsSchema);

dropCallsSchema.virtual('user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('extension', {
    ref: ExtensionSchema.name,
    localField: 'extension_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('lead_details', {
    ref: LeadManagementSchema.name,
    localField: 'lead_uuid',
    foreignField: 'lead_management_uuid',
})
dropCallsSchema.virtual('ivr', {
    ref: IvrSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('ring_group', {
    ref: RinggroupSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('call_queue', {
    ref: CallQueueSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('disposition_details', {
    ref: DispositionSchema.name,
    localField: 'hangup_cause',
    foreignField: 'disposition_uuid',
})
dropCallsSchema.virtual('telecom_circle', {
    ref: TelecomCircleSchema.name,
    localField: 'circle_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('outbound_campaign', {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('inbound_campaign', {
    ref: InboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('blended_campaign', {
    ref: BlendedCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
})
dropCallsSchema.virtual('time_condition', {
    ref: TimeconditionSchema.name,
    localField: 'pbx_feature_uuid',
    foreignField: 'uuid',
})

dropCallsSchema.virtual('converted_date').get(function () {
    if (this.callstart) {
        return this.callstart.split(' ')[0];
    }
    return '';
});

export { dropCallsSchema }
