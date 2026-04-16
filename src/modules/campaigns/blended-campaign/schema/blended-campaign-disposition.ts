import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type BlendedCampaignDispositionDocument = BlendedCampaignDispositionSchema & Document;

@Schema({ collection : "blended_campaign_disposition" , timestamps : true })

export class BlendedCampaignDispositionSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    blended_campaign_disposition_uuid: String

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
    blended_campaign_uuid : String
}

export const blendedCampaigndispositionSchema = SchemaFactory.createForClass(BlendedCampaignDispositionSchema);

