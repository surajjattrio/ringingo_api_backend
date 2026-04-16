import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { UserRoleSchema } from "src/modules/user-role/schema/user-role.schema";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";

export type Whatsapp_available_agentDocument = Whatsapp_available_agentSchema & Document

@Schema( { collection: "whatsapp_available_agent", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class Whatsapp_available_agentSchema {

    @Prop()
    phone_number_id: String

    @Prop()
    uuid: String

    @Prop()
    user_uuid?: String

    @Prop()
    tenant_uuid: String

    @Prop()
    browserToken: String

    @Prop()
    type: String

}
let whatsapp_available_agentSchema = SchemaFactory.createForClass( Whatsapp_available_agentSchema )
whatsapp_available_agentSchema.virtual( 'agent_permission', {
    ref: UserRoleSchema.name,
    localField: 'user_role_uuid',
    foreignField: 'uuid',
} )
whatsapp_available_agentSchema.virtual( 'extension_details', {
    ref: ExtensionSchema.name,
    localField: 'default_extension',
    foreignField: 'uuid',
} )
whatsapp_available_agentSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )
export { whatsapp_available_agentSchema }

