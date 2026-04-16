import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";
import { MessagingChannelSchema } from "src/modules/messaging-channel/schema/messaging-channel.schema";
import { MessagingQueueSchema } from "src/modules/messaging-queue/schema/messaging-queue.schema";
let json_data = [
     {
          "field1": "fielddata"
     }
]
export type ArchieveOminchannelmessageDocument = ArcheiveOmnichannelmessageSchema & Document

@Schema( {
     collection: "archieveomnichannelmessage", timestamps: true
     , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }
} )

export class ArcheiveOmnichannelmessageSchema {
     @Prop()
     uuid: string

     @Prop()
     from_number: String

     @Prop()
     user_uuid: String

     @Prop()
     tenant_uuid: String

     @Prop()
     phone_number_id: String

     @Prop()
     lead_management_uuid: String

     @Prop()
     disposition_uuid: String

     @Prop()
     note: String

     @Prop( { default: json_data, type: Array } )
     message_json: Object

     @Prop()
     type: string

     @Prop()
     channnel_type: string
}

let archieveomnichannelmessageSchema = SchemaFactory.createForClass( ArcheiveOmnichannelmessageSchema );
archieveomnichannelmessageSchema.virtual( 'user', {
     ref: UserSchema.name,
     localField: 'user_uuid',
     foreignField: 'uuid',
} )
archieveomnichannelmessageSchema.virtual( 'tenant', {
     ref: TenantSchema.name,
     localField: 'tenant_uuid',
     foreignField: 'uuid',
} )
archieveomnichannelmessageSchema.virtual( 'messaging_channel', {
     ref: MessagingChannelSchema.name,
     localField: 'messaging_channel_uuid',
     foreignField: 'uuid',
} )
archieveomnichannelmessageSchema.virtual( 'messaging_queue', {
     ref: MessagingQueueSchema.name,
     localField: 'messaging_queue_uuid',
     foreignField: 'uuid',
} )

export { archieveomnichannelmessageSchema }