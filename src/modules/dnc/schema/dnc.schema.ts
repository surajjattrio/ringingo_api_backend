import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";


export type DncDocument = DncSchema & Document

@Schema({
    collection: "dnc", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class DncSchema {
 

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

   @Prop()
    name: String


    @Prop({ unique: true })
    phone_number: String

    @Prop()
    status: String

    @Prop()
    global_status: String

    @Prop()
    concurrent_cam: String

    @Prop()
    campaign_uuid: String

    @Prop()
    tenant_uuid: String


}

let dncSchema = SchemaFactory.createForClass(DncSchema);

dncSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})

dncSchema.virtual('campaign', {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
})
export { dncSchema }
