import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";
import { UserSchema } from "src/modules/user/schema/user.schema";

export type FollowUpDocument = FollowUpSchema & Document;

@Schema( { collection: "follow_up", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class FollowUpSchema {

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    follow_up_uuid: String

    @Prop()
    lead_management_uuid: String

    @Prop()
    type: String

    @Prop()
    date_time: String

    @Prop()
    user_uuid: String

    @Prop()
    comment: String

    @Prop()
    tenant_uuid: String

    @Prop()
    created_flag: String

    @Prop()
    reminder_date_time: String

    @Prop( { default: "0" } )
    is_readed: String

    @Prop()
    notification_status: String;

    @Prop( { type: Array } )
    reschedule_details: Object

    @Prop()
    converted_date: String
}

let followUpSchema = SchemaFactory.createForClass( FollowUpSchema );
followUpSchema.virtual( 'lead_details', {
    ref: LeadManagementSchema.name,
    localField: 'lead_management_uuid',
    foreignField: 'lead_management_uuid',
} );
followUpSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} );
export { followUpSchema }
