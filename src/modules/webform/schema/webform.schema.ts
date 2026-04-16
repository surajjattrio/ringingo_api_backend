import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";


export type WebformDocument = WebformSchema & Document

@Schema({
    collection: "webform", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
})

export class WebformSchema {
 

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

   @Prop()
    name: String

    @Prop()
    description: String

    @Prop()
    url: String

    @Prop()
    tenant_uuid: String


}

let webformSchema = SchemaFactory.createForClass(WebformSchema);

webformSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
});

// webformSchema.virtual('campaign', {
//     ref: OutboundCampaignSchema.name,
//     localField: 'campaign_uuid',
//     foreignField: 'uuid',
// })
export { webformSchema }
