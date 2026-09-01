import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { CountrySchema } from "src/modules/country/schema/country.schema";
import { RolesSchema, } from "src/modules/roles/schema/roles-schema";
import { TimezoneSchema } from "src/modules/timezone/schema/timezone.schema";
import { OutgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";


export type TenantDocument = TenantSchema & Document;

@Schema( { collection: "tenant", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class TenantSchema {

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    uuid: String

    @Prop()
    tenant_name: String;

    @Prop()
    username: String;

    @Prop()
    password: String;

    @Prop( { is_unique: true } )
    domain: String;

    @Prop()
    status: String;

    @Prop()
    time_zone_uuid: String

    @Prop()
    email: String

    @Prop()
    mobile_number: String;

    @Prop()
    role_uuid: String

    @Prop()
    country_uuid: String

    @Prop()
    creation_uuid: String

    @Prop()
    update_uuid: String

    @Prop()
    tenant_uuid?: String

    @Prop()
    sip_profile_uuid: String

    @Prop()
    role?: String

    @Prop()
    outgoing_rule_uuid: String

    @Prop()
    concurrent_calls: String

    @Prop()
    web_hook: String

    @Prop( { default: "1" } )
    add_anonymous_lead: String

    @Prop()
    mail_link_status: String

    @Prop()
    timezoneName?: String

    @Prop()
    account_code: String

    @Prop( { default: "0" })
    system_disposition: String

    @Prop( { unique: true } )
    company_code: String;

    @Prop()
    vendor_uid: String;

    @Prop()
    vendor_token: String;

    @Prop({ index: true })
    api_key: String;
}

let tenantSchema = SchemaFactory.createForClass( TenantSchema );
tenantSchema.virtual( 'roles', {
    ref: RolesSchema.name,
    localField: 'role_uuid',
    foreignField: 'uuid',
} )
tenantSchema.virtual( 'country', {
    ref: CountrySchema.name,
    localField: 'country_uuid',
    foreignField: 'uuid',
} )
tenantSchema.virtual( 'timezone', {
    ref: TimezoneSchema.name,
    localField: 'time_zone_uuid',
    foreignField: 'uuid',
} )
tenantSchema.virtual( 'outgoing_rule', {
    ref: OutgoingRulesSchema.name,
    localField: 'outgoing_rule_uuid',
    foreignField: 'uuid',
} )
export { tenantSchema }


