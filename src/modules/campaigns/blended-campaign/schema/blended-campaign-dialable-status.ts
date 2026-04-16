import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { BlendedCampaignDispositionSchema } from "./blended-campaign-disposition";

export type BlendedCampaignDialableDocument = BlendedCampaignDialableStatus & Document;

@Schema({ collection : "blended_campaign_dialable_status" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class BlendedCampaignDialableStatus {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    blended_campaign_disposition_uuid : String

    @Prop()
    disposition_uuid : String

    @Prop()
    blended_campaign_uuid : String

    @Prop()
    tenant_uuid : String

}

let blendedCampaignDialableStatus = SchemaFactory.createForClass(BlendedCampaignDialableStatus);
blendedCampaignDialableStatus.virtual('disposition' , {
    ref: DispositionSchema.name,
    localField: 'disposition_uuid',
    foreignField: 'disposition_uuid',
})
blendedCampaignDialableStatus.virtual('blended_campaign_disposition' , {
    ref: BlendedCampaignDispositionSchema.name,
    localField: 'blended_campaign_disposition_uuid',
    foreignField: 'blended_campaign_disposition_uuid',
})

export { blendedCampaignDialableStatus }


