import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";
const { v4: uuidv4 } = require( 'uuid' );

export type WhatsappsyncDocument = WhatsappsyncSchema & Document

@Schema( {
    collection: "whatsapp_sync", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class WhatsappsyncSchema {
    @Prop( {
        type: String, default: function radomUUID () { return randomUUID() },
        unique: true
    } )
    uuid: string

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    browserToken: String

    @Prop()
    phone_number_id: String

    @Prop()
    from_number: String

    @Prop()
    transfer_uuid: String

    @Prop()
    transfer_username: String

    // @Prop()
    // whatsapp_messaging_channel_uuid: String
}

let whatsappsyncSchema = SchemaFactory.createForClass( WhatsappsyncSchema );
whatsappsyncSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
whatsappsyncSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )
export { whatsappsyncSchema }
