import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type CampaignStaticsDocument = CampaignStaticsSchema & Document;

@Schema({ collection : "campaign_statistics" })

export class CampaignStaticsSchema {

    @Prop()
    campaign_uuid : String

    @Prop()
    success : Number

    @Prop()
    fail : Number

    @Prop()
    drop : Number

    @Prop()
    tenant_uuid : String
    
    @Prop()
    short_call : String

    @Prop()
    campaign_date : String
}

export const campaignStaticsSchema = SchemaFactory.createForClass(CampaignStaticsSchema);
