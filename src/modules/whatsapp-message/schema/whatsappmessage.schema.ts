import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";

export type WhatsappmessageDocument = WhatsappmessageSchema & Document

@Schema( {
    collection: "whatsappmessage", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class WhatsappmessageSchema {
    @Prop( {
        type: String, default: function radomUUID () { return randomUUID() },
        unique: true
    } )
    uuid: string

    @Prop({ index: true, unique: true, sparse: true })
    provider_message_id?: string;

    @Prop()
    from_number: String

    @Prop()
    to: String

    @Prop()
    text_content: String

    @Prop()
    image_url: String[]

    @Prop()
    document_url: String[]

    @Prop()
    message_id: String

    // @Prop()
    // filename: String

    @Prop()
    text_type: String

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    messaging_channel_uuid: String

    @Prop()
    messaging_queue_uuid: String

    @Prop()
    phone_number_id: String

    @Prop()
    message_type: String

    @Prop()
    timestamp: String

    @Prop()
    name: String

    @Prop()
    lead_management_uuid: String

    @Prop()
    notification_type: String

    @Prop()
    converted_date: String

    @Prop( { type: Object } )
    template_name: String

    @Prop()
    template_language_code: String

    // @Prop()
    // messaging_queue_uuid: String

    @Prop()
    whatsapp_business_account_id: String

    @Prop()
    unread_message: String

    @Prop()
    whatsapp_messaging_channel_uuid: String

    @Prop()
    transfer_uuid: String

    @Prop()
    transfer_username: String

}

let whatsappmessageSchema = SchemaFactory.createForClass( WhatsappmessageSchema );
whatsappmessageSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
whatsappmessageSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )
whatsappmessageSchema.virtual( 'messaging_channel', {
    ref: MessagingChannelSchema.name,
    localField: 'messaging_channel_uuid',
    foreignField: 'uuid',
} )
whatsappmessageSchema.virtual( 'messaging_queue', {
    ref: MessagingQueueSchema.name,
    localField: 'messaging_queue_uuid',
    foreignField: 'uuid',
} )

export { whatsappmessageSchema }
