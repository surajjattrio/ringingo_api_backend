import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type OutboundCampaignDispositionDocument = OutboundCampaignDispositionSchema & Document;

@Schema({ collection : "outbound_campaign_disposition" , timestamps : true })

export class OutboundCampaignDispositionSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    outbound_campaign_disposition_uuid: String

    @Prop()
    name : String

    @Prop()
    code : String

    @Prop()
    tenant_uuid : String

    @Prop()
    created_flag : String

    @Prop()
    status : String

    @Prop()
    outbound_campaign_uuid : String
}

export const outboundCampaigndispositionSchema = SchemaFactory.createForClass(OutboundCampaignDispositionSchema);
