import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";

let messaging_queue_extensions = [
    'fbc83821-fea4-4dbb-8088-47b8290a4316',
    '14dbd4ed-7e4a-4869-b73c-0bc808b491ed'
]
let messaging_queue_channel = {
    "WhatsApp": [ "fbc83821-fea4-4dbb-8088-47b8290a4316", "14dbd4ed-7e4a-4869-b73c-0bc808b491ed" ],
    "Chat": [ "fbc83821-fea4-4dbb-8088-47b8290a4316" ],
    "SMS": []
}

export type MessagingQueueDocument = MessagingQueueSchema & Document

@Schema( {
    collection: "messaging_queue", timestamps: true
    , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class MessagingQueueSchema {
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
    extension_uuid: string

    // @Prop( { type: Object, default: messaging_queue_extensions } )
    // messaging_queue_extensions: object;
    @Prop( { type: [ String ], messaging_queue_extensions } )
    messaging_queue_extensions: string[];

    @Prop()
    provider: string

    // @Prop( { type: [ String ], default: messaging_queue_channel } )
    // messaging_queue_channel: string[];

    @Prop( { type: Object } ) // Change type to Object
    messaging_queue_channel: Record<string, string[]>;

    @Prop()
    user_uuid: String

    @Prop()
    tenant_uuid: String

    // @Prop()
    // messaging_channel_uuid: String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string

}

let messagingqueueSchema = SchemaFactory.createForClass( MessagingQueueSchema );
messagingqueueSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} )
messagingqueueSchema.virtual( 'tenant', {
    ref: TenantSchema.name,
    localField: 'tenant_uuid',
    foreignField: 'uuid',
} )
// messagingqueueSchema.virtual( 'extension', {
//     ref: ExtensionSchema.name,
//     localField: 'extension_uuid',
//     foreignField: 'uuid',
// } );
messagingqueueSchema.virtual( 'messaging_channel', {
    ref: MessagingChannelSchema.name,
    localField: 'messaging_queue_channel',
    foreignField: 'uuid',
} );
export { messagingqueueSchema }
