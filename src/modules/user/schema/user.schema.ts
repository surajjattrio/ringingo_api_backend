import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserRoleSchema } from "src/modules/user-role/schema/user-role.schema";
import { UserGroupSchema } from "src/modules/user-group/schema/user-group.schema";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { OutboundCampaignSchema } from "src/modules/campaigns/outbound-campaign/schema/outbound-campaign.schema";


export type UserDocument = UserSchema & Document

@Schema({ collection: "user", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class UserSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    username: String

    @Prop()
    fullname: String

    @Prop()
    email: String

    @Prop()
    password: String

    @Prop()
    default_timeout: String

    @Prop()
    recording: String

    @Prop()
    create_sip_device: String

    @Prop()
    status: String

    @Prop({ default: "" })
    extension_type: String

    @Prop({ default: "" })
    default_extension: String

    @Prop()
    tenant_uuid: String

    @Prop({ default: "" })
    campaign_uuid: String

    @Prop({ default: () => [] })
    allowed_campaign!: string[];

    @Prop()
    user_role_uuid: String

    @Prop()
    user_group_uuid: String

    @Prop({ default: "1" }) /*For web*/
    is_logged_in: String

    @Prop()
    mail_link_status: String

    /****** Below params are for mobile ******/

    @Prop({ default: "1" })
    is_logged_in_mobile: String

    @Prop({ default: "" })
    device_id: String

    @Prop({ default: "" })
    callkit_token: String

    @Prop({ default: "" })
    apns_token: String

    @Prop({ default: "" })
    mobile_type: String

    @Prop()
    manager_uuid: String

    @Prop()
    zoho_user_id: String

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
    // whatsapp_messaging_channel_uuid:String

    @Prop()
    browserToken: String //Platform WEB
}

let userSchema = SchemaFactory.createForClass(UserSchema);
userSchema.virtual('user_roles', {
    ref: UserRoleSchema.name,
    localField: 'user_role_uuid',
    foreignField: 'uuid',
})
userSchema.virtual('tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
})
userSchema.virtual('user_group', {
    ref: UserGroupSchema.name,
    localField: 'user_group_uuid',
    foreignField: 'uuid',
})
userSchema.virtual('default_extension_detail', {
    ref: "extension",
    localField: 'default_extension',
    foreignField: 'uuid',
})


export { userSchema }

