import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { UserRoleSchema } from "src/modules/user-role/schema/user-role.schema";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";

export type AgentDocument = AgentSchema & Document

@Schema({ collection: "user", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class AgentSchema {

    @Prop()
    username: String

    @Prop()
    fullname: String

    @Prop()
    password: String

    @Prop()
    uuid?: String

    @Prop()
    email?: String

    @Prop()
    tenant_uuid?: String

    @Prop()
    is_logged_in: String

    @Prop()
    default_extension: String

    @Prop()
    is_logged_in_mobile: String

    @Prop()
    browserToken: String

    @Prop()
    device_id: String

    @Prop()
    callkit_token: String

    @Prop()
    apns_token: String

    @Prop()
    mobile_type: String

    @Prop()
    status: String

    @Prop()
    manager_uuid: string

    @Prop({
        type: [
            {
                value: { type: String },
                label: { type: String },
            },
        ],
        default: [],
    })
    omni_messaging_channel_uuid: {
        value: string;
        label: string;
    }[];

    @Prop()
    campaign_uuid: String
}

let agentSchema = SchemaFactory.createForClass(AgentSchema)
agentSchema.virtual('agent_permission', {
    ref: UserRoleSchema.name,
    localField: 'user_role_uuid',
    foreignField: 'uuid',
})
agentSchema.virtual('extension_details', {
    ref: ExtensionSchema.name,
    localField: 'default_extension',
    foreignField: 'uuid',
})
agentSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
export { agentSchema }
