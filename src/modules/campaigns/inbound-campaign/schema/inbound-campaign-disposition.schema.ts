import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type InboundCampaignDispositionDocument = InboundCampaignDispositionSchema & Document;

@Schema({ collection : "inbound_campaign_disposition" , timestamps : true })

export class InboundCampaignDispositionSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    inbound_campaign_disposition_uuid: String

    @Prop()
    name : String

    @Prop()
    code : String

    @Prop()
    tenant_uuid : String

    @Prop()
    status : String

    @Prop()
    inbound_campaign_uuid : String
}

export const inboundCampaigndispositionSchema = SchemaFactory.createForClass(InboundCampaignDispositionSchema);
