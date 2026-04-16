import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { CountrySchema } from "src/modules/country/schema/country.schema";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { UserGroupSchema } from "src/modules/user-group/schema/user-group.schema";

export type LeadGroupDocument = LeadGroupSchema & Document;

@Schema({ collection : "lead_group" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class LeadGroupSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    name : String

    @Prop()
    description : String

    @Prop()
    status : String

    @Prop()
    user_group_uuid : String

    @Prop()
    campaign_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    totalLeadCount : Number

    @Prop()
    manager_uuid: string

    @Prop()
    role: string

    @Prop({default:0})
    human_answer : Number

     @Prop({default:0})
    sale : Number

    @Prop()
    campaign_flag: string

    
}

let leadGroupSchema = SchemaFactory.createForClass(LeadGroupSchema);
leadGroupSchema.virtual('user_group' , {
    ref: UserGroupSchema.name,
    localField: 'user_group_uuid',
    foreignField: 'uuid',
});
leadGroupSchema.virtual( 'campaign_details', {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
} );
leadGroupSchema.virtual( 'disposition', {
    ref: DispositionSchema.name,
    localField: 'lead_status',
    foreignField: 'disposition_uuid',
} );
leadGroupSchema.virtual( 'country', {
    ref: CountrySchema.name,
    localField: 'country_uuid',
    foreignField: 'uuid',
} );
export { leadGroupSchema }
