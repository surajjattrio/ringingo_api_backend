import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document, Schema as MongooseSchema } from "mongoose";
import { CountrySchema } from "src/modules/country/schema/country.schema";
import { DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { LeadGroupSchema } from "src/modules/lead-group/schema/lead-group.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { PbxLeadStatusSchema } from "src/modules/pbx-lead-status/schema/pbx-lead-status.schema";

let custom_field_list = [
    {
        "field1": "fielddata"
    }
]


export type LeadManagementDocument = LeadManagementSchema & Document;

@Schema( { collection: "lead_management", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class LeadManagementSchema {

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    lead_management_uuid: String

    @Prop()
    lead_group_uuid: string

    @Prop()
    first_name: String

    @Prop()
    last_name: String

    @Prop()
    address: String

    @Prop()
    state: String

    @Prop()
    province: String

    @Prop()
    postal_code: String

    @Prop()
    dob: String

    @Prop()
    phone_code: String

    @Prop()
    phone_number: String

    @Prop()
    alternate_phone_number: String

    @Prop()
    email: String

    @Prop()
    status: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    gender: String

    @Prop()
    description: String

    @Prop()
    created_flag: String

    @Prop()
    country_uuid: String

    @Prop()
    lead_status: String
    
    @Prop()
    lead_status_1: String
    
    @Prop()
    lead_status_2: String

    @Prop()
    city: String

    @Prop()
    campaign_uuid: String

    @Prop()
    custom_phone_number: String

    @Prop( { default: 0 } )
    call_count: Number

    @Prop( { default: 1 } )
    in_dnc: String

    @Prop()
    converted_date: String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string

    @Prop({ type: MongooseSchema.Types.Mixed })
    custom_fields: any;

    @Prop( { default: 0 } )
    retries_count: Number

    @Prop({ type: String, index: true, unique: true, sparse: true })
	token: string;

    @Prop()
    product1: string

}

let leadManagementSchema = SchemaFactory.createForClass( LeadManagementSchema );
leadManagementSchema.virtual( 'country', {
    ref: CountrySchema.name,
    localField: 'country_uuid',
    foreignField: 'uuid',
} );
leadManagementSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} );
leadManagementSchema.virtual( 'disposition', {
    ref: DispositionSchema.name,
    localField: 'lead_status',
    foreignField: 'disposition_uuid',
} );
leadManagementSchema.virtual( 'disposition_1', {
    ref: DispositionSchema.name,
    localField: 'lead_status_1',
    foreignField: 'disposition_uuid',
} );
leadManagementSchema.virtual( 'disposition_2', {
    ref: DispositionSchema.name,
    localField: 'lead_status_2',
    foreignField: 'disposition_uuid',
} );
leadManagementSchema.virtual( 'lead_group', {
    ref: LeadGroupSchema.name,
    localField: 'lead_group_uuid',
    foreignField: 'uuid',
} );
leadManagementSchema.virtual( 'campaign_details', {
    ref: OutboundCampaignSchema.name,
    localField: 'campaign_uuid',
    foreignField: 'uuid',
} );
leadManagementSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} );
leadManagementSchema.virtual('cdrs_details' , {
    ref: "cdrs",
    localField: 'lead_management_uuid',
    foreignField: 'lead_uuid',
})
leadManagementSchema.virtual('pbx_lead_status' , {
    ref: PbxLeadStatusSchema.name,
    localField: 'lead_status',
    foreignField: 'pbx_lead_status_uuid',
})

export { leadManagementSchema };

