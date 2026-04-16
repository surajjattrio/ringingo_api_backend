import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";


export type ManualDialDocument = ManualDialSchema & Document

@Schema({
    collection: "manual-dial", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class ManualDialSchema {
 

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

  
    @Prop()
    dial_number: String


    @Prop()
    campaign_uuid: String

    @Prop()
    campaign_type: String

    @Prop()    
    custom_phone_number : String

    @Prop()    
    campaign_flag : String

}

let manualDialSchema = SchemaFactory.createForClass(ManualDialSchema);

manualDialSchema.virtual('campaign', {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
})
export { manualDialSchema }
