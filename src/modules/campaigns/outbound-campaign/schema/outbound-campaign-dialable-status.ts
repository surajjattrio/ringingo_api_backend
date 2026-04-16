import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { OutboundCampaignDispositionSchema } from "./outbound-campaign-disposition.schema";

export type OutboundCampaignDialableDocument = OutboundCampaignDialableStatus & Document;

@Schema({ collection : "outbound_campaign_dialable_status" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class OutboundCampaignDialableStatus {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    outbound_campaign_disposition_uuid : String

    @Prop()
    disposition_uuid : String

    @Prop()
    outbound_campaign_uuid : String

    @Prop()
    tenant_uuid : String

}

let outboundCampaignDialableStatus = SchemaFactory.createForClass(OutboundCampaignDialableStatus);
outboundCampaignDialableStatus.virtual('disposition' , {
    ref: DispositionSchema.name,
    localField: 'disposition_uuid',
    foreignField: 'disposition_uuid',
})
outboundCampaignDialableStatus.virtual('outbound_campaign_disposition' , {
    ref: OutboundCampaignDispositionSchema.name,
    localField: 'outbound_campaign_disposition_uuid',
    foreignField: 'outbound_campaign_disposition_uuid',
})

export { outboundCampaignDialableStatus }

