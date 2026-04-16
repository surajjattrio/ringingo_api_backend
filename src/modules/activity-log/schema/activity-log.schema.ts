import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type ActivityLogDocument = ActivityLogSchema & Document;

@Schema({ collection: "activity_log", timestamps: true })
export class ActivityLogSchema {
    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String;

    @Prop()
    user_uuid: String;

    @Prop()
    tenant_uuid: String;

    @Prop()
    campaign_uuid: String;

    @Prop()
    role: String;

    @Prop()
    module: String;

    @Prop()
    action: String;

    @Prop()
    method: String;

    @Prop()
    url: String;

    @Prop({ type: Object })
    payload: Object;

    @Prop({ type: Object })
    response: Object;

    @Prop()
    ip_address: String;

    @Prop()
    browser: String;

    @Prop({ default: 'Unknown' })
    location: String;

    @Prop({ default: '' })
    coordinates: String;

    @Prop()
    status_code: Number;

    @Prop()
    user_name: String;

    @Prop()
    tenant_name: String;

    @Prop()
    campaign_name: String;
}

export const activityLogSchema = SchemaFactory.createForClass(ActivityLogSchema);
