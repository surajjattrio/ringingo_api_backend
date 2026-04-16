import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { LeadManagementSchema } from "./lead-management.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";

export type LeadsInQueueDocument = LeadsInQueueSchema & Document;

@Schema({ collection: "leads_in_queue", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class LeadsInQueueSchema {

    @Prop()
    lead_group_uuid: string

    /*@Prop()
    first_name: String

    @Prop()
    last_name: String

    @Prop()
    address: String

    @Prop()
    state: String

    @Prop()
    province: String

    @Prop()
    postal_code: String

    @Prop()
    dob: String

    @Prop()
    phone_code: String

    @Prop()
    phone_number: String

    @Prop()
    alternate_phone_number: String

    @Prop()
    email: String

    @Prop()
    status: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    gender: String

    @Prop()
    description: String

    @Prop()
    created_flag: String

    @Prop()
    country_uuid: String

    @Prop()
    lead_status: String

    @Prop()
    city: String */

    @Prop()
    campaign_uuid: String

    @Prop()
    lead_management_uuid: String

    @Prop({ default: [], type: Array })
    agent_uuid: Object

    @Prop()
    assigned_agent_uuid: string;

    @Prop()
    tenant_uuid: String

    @Prop()
    bridge_uuid: String

    @Prop()
    resend_lead_time: Date

    @Prop()
    lead_resent_count: String

    @Prop({ default: "1" })
    lead_sent: String

    @Prop()
    checkdate: String

    @Prop()
    campaign_flag: string

}

let leadsInQueueSchema = SchemaFactory.createForClass(LeadsInQueueSchema);
leadsInQueueSchema.virtual('outbound_campaign_details', {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
leadsInQueueSchema.virtual('inbound_campaign', {
    ref: InboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
leadsInQueueSchema.virtual('blended_campaign', {
    ref: BlendedCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
leadsInQueueSchema.virtual('lead_details', {
    ref: LeadManagementSchema.name,
    localField: 'lead_management_uuid',
    foreignField: 'lead_management_uuid',
});
leadsInQueueSchema.virtual('user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
});
leadsInQueueSchema.virtual('lead_group', {
    ref: LeadGroupSchema.name,
    localField: 'lead_group_uuid',
    foreignField: 'uuid',
});
leadsInQueueSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
});
export { leadsInQueueSchema }
