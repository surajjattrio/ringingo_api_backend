import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { UserSchema } from "src/modules/user/schema/user.schema";


export type RecordingsDocument = RecordingsSchema & Document;

@Schema( { collection: "recording", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )
export class RecordingsSchema {

    @Prop()
    uuid: String

    @Prop()
    user_uuid: String

    @Prop()
    extension_uuid: String

    @Prop()
    tenant_uuid: String

    @Prop()
    caller_id_name: String

    @Prop()
    caller_id_number: String

    @Prop()
    destination_number: String

    @Prop()
    billsecond: String

    @Prop()
    recording_path: String

    @Prop()
    direction: String

    @Prop()
    campaign_uuid: String

    @Prop()
    callstart: String

    @Prop()
    caller_id: String

    @Prop()
    caller_name: String

    @Prop()
    converted_date: String

    @Prop( { type: Boolean, default: false } )
    is_uploaded: Boolean
}

let recordingsSchema = SchemaFactory.createForClass( RecordingsSchema );
recordingsSchema.virtual( 'user', {
    ref: UserSchema.name,
    localField: 'user_uuid',
    foreignField: 'uuid',
} );

export { recordingsSchema }
