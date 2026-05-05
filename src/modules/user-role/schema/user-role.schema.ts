import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";

export type UserRoleDocument = UserRoleSchema & Document;

@Schema( { collection: "user_role", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class UserRoleSchema {

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    uuid: String

    @Prop()
    name: String

    @Prop()
    status: String

    @Prop()
    pbx_mode: String

    @Prop()
    call_center_mode: String

    @Prop()
    call_report: String

    @Prop()
    login_logout_report: String

    @Prop()
    tenant_uuid: String

    @Prop()
    recording: String

    @Prop()
    sticky_agent: String

    @Prop()
    number_masking: String

    @Prop()
    unallocated_leads: String

    @Prop()
    follow_up: String

    @Prop()
    settings: String

    @Prop()
    breakcode: String

    @Prop()
    manager_uuid: String

    @Prop()
    role: String

    @Prop()
    whatsapp: String

    @Prop()
    instagram: String

    @Prop()
    facebook: String

    @Prop()
    sms: String
    
    @Prop()
    force_login: String

    @Prop()
    agent_script: String

    @Prop({ default: "1" })
    auto_logout: String

    @Prop({ default: "30" })
    idle_timeout: String
}

let userRoleSchema = SchemaFactory.createForClass( UserRoleSchema );
userRoleSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )

export { userRoleSchema }
