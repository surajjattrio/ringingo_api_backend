import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type ArchiveFollowUpDocument = ArchiveFollowUpSchema & Document;

@Schema({ collection: "follow_up_archive", timestamps: true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class ArchiveFollowUpSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
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
    created_flag : String

    @Prop()
    reminder_date_time : String
}

export const archiveFollowUpSchema = SchemaFactory.createForClass(ArchiveFollowUpSchema);
