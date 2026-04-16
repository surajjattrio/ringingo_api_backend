import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { InboundCampaignSchema } from "src/modules/campaigns/inbound-campaign/schema/inbound-campaign.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { BlendedCampaignSchema } from "src/modules/campaigns/blended-campaign/schema/blended-campaign.schema";

export type AgentCampaignLoginDocument = AgentCampaignLoginSchema & Document;

@Schema({ collection : "agent_campaign_login" , timestamps : true })

export class AgentCampaignLoginSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    agent_campaign_login_uuid: String

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

let agentCampaignLoginSchema = SchemaFactory.createForClass(AgentCampaignLoginSchema);
agentCampaignLoginSchema.virtual('inbound_campaign_details' , {
    ref: InboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
agentCampaignLoginSchema.virtual('outbound_campaign_details' , {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
agentCampaignLoginSchema.virtual('blended_campaign_details' , {
    ref: BlendedCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
});
export { agentCampaignLoginSchema };

