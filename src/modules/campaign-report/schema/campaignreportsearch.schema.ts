import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { AgentLoginLogoutSchema } from "src/modules/call-center/schema/agent-login-logout.schema";

export type CampaignreportsearchDcoument = CampaignSummary & Document;

@Schema({ collection : "campaign_report_search" , timestamps : true , toJSON : { virtuals : true , getters : true} , toObject : { virtuals : true , getters : true}})

export class  CampaignSummary {

    @Prop()
    callstart : String

    @Prop()
    callend : String

    @Prop({ required: false })
    campaign_uuid: string; // Store the user UUID if a specific user was selected

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid : String

    @Prop()
    agent_logged_count: String
  
    @Prop({ default: 0 }) // Default flag to 0
    flag: number;

    @Prop({ default: 0 }) // Default flag to 0
    call_transfer: 0;
}

 let campaignreportsearchSummary = SchemaFactory.createForClass(CampaignSummary);
 campaignreportsearchSummary.virtual('user' , {
    ref: DispositionSchema.name,
    localField: 'user_uuid',
    foreignField: 'user_uuid',
})
export { campaignreportsearchSummary }

