import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type AutoCampaignOriginateDocument = Document & AutoCampaignOriginateSchema;

@Schema({ collection : "auto_campaign_originate" , timestamps : true })

export class AutoCampaignOriginateSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    auto_campaign_originate_uuid: String

    @Prop()
    campaign_uuid: String;

    @Prop()
    sip_uri: String;

    @Prop()
    agent_uuid: String;

    @Prop()
    tenant_uuid: String;

    @Prop({default : "0"})
    flag : String

    @Prop()
    username: String;

    @Prop()
    domain: String;


    @Prop({default : 0})
    call_count : Number
}

export const autoCampaignOriginateSchema = SchemaFactory.createForClass(AutoCampaignOriginateSchema);
