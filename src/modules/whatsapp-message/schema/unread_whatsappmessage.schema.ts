import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";

export type UnreadwhatsappmessageDocument = UnreadwhatsappmessageSchema & Document

@Schema( {
    collection: "unread_whatsappmessage", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class UnreadwhatsappmessageSchema {
    @Prop( {
        type: String, default: function radomUUID () { return randomUUID() },
        unique: true
    } )
    uuid: string

    @Prop()
    from_number: String

    @Prop()
    display_phone_number: String

    @Prop()
    message_id: String

    @Prop()
    type: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    text_content: String

    @Prop()
    text_type: String

    @Prop()
    phone_number_id: String

    @Prop()
    message_type: String

    @Prop()
    timestamp: String

    @Prop()
    name: String

    @Prop()
    unread: String

    @Prop()
    whatsup_sync: String

}

let unreadwhatsappmessageSchema = SchemaFactory.createForClass( UnreadwhatsappmessageSchema );
unreadwhatsappmessageSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
unreadwhatsappmessageSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )
unreadwhatsappmessageSchema.virtual( 'messaging_channel', {
    ref: MessagingChannelSchema.name,
    localField: 'messaging_channel_uuid',
    foreignField: 'uuid',
} )
unreadwhatsappmessageSchema.virtual( 'messaging_queue', {
    ref: MessagingQueueSchema.name,
    localField: 'messaging_queue_uuid',
    foreignField: 'uuid',
} )

export { unreadwhatsappmessageSchema }
