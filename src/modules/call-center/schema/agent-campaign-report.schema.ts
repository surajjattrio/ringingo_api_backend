import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";

export type AgentCampaignReportDocument = AgentCampaignReportSchema & Document;

@Schema({ collection : "agent_campaign_report" , timestamps : true })

export class AgentCampaignReportSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    agent_campaign_report_uuid: String

    @Prop()
    login_status : String

    @Prop()
    agent_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    campaign_uuid : String

    /*@Prop({default : function genUUID() { return new Date().toISOString(); }})
    createdAt : String*/
}

let agentCampaignReportSchema = SchemaFactory.createForClass(AgentCampaignReportSchema);
agentCampaignReportSchema.virtual('inbound_campaign_details' , {
    ref: InboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
agentCampaignReportSchema.virtual('outbound_campaign_details' , {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
agentCampaignReportSchema.virtual('blended_campaign_details' , {
    ref: BlendedCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
export { agentCampaignReportSchema };
