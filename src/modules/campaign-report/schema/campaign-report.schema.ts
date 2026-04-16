import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
export type CampaignReportDocument = CampaignReportSchema & Document;

@Schema( { collection: "campaign_report", timestamps: true } )

export class CampaignReportSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    campaign_name: String

    @Prop({default : 0})
    logged_in_agent: Number

    @Prop({default : 0})
    lead_dialed: Number

    @Prop({default : 0})
    answered_call: Number

    @Prop({default : 0})
    drop_calls: Number

    @Prop({default : 0})
    sale_count: Number

    @Prop({default : 0})
    incoming_calls: Number

    @Prop({default : "00:00:00"})
    acd: String 
    
    @Prop()
    campaign_uuid : String

    @Prop()
    fullname: String

    @Prop({ type: [Object], default: [] })
    agents: any[]
}
let campaignReportSchema = SchemaFactory.createForClass( CampaignReportSchema );
export { campaignReportSchema }

