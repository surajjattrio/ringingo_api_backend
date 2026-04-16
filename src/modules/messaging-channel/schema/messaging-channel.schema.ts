import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
let customFields =
{
    "token": "example_token1",
    "webhook_url": "example_webhook_url",
    "phone": "123456789",
}


export type MessagingChannelDocument = MessagingChannelSchema & Document

@Schema( {
    collection: "messaging_channel", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class MessagingChannelSchema {
    @Prop( {
        type: String, default: function radomUUID () { return randomUUID() },
        unique: true
    } )
    uuid: string

    @Prop( { is_unique: true } )
    name: String

    @Prop()
    status: String

    @Prop()
    type: String

    @Prop()
    provider: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    // @Prop( { type: Object, default: customFields } )
    // customFields: object;

    @Prop( { type: Object } ) // Change type to Object
    customFields: Record<string, string[]>;

    @Prop()
    manager_uuid: string

    @Prop()
    role: string

    // @Prop()
    // whatsapp_business_account_id: String
}

let messagingchannelSchema = SchemaFactory.createForClass( MessagingChannelSchema );
messagingchannelSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
messagingchannelSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )

export { messagingchannelSchema }
