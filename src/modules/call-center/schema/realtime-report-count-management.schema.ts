import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type RealtimReportCountManagementDocument = RealtimReportCountManagementSchema & Document;

@Schema({ collection: "realtime_report_count_mgmt", timestamps: true })

export class RealtimReportCountManagementSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    lead_uuid: String;

    @Prop()
    campaign_uuid: String;

    @Prop()
    tenant_uuid: String;

    @Prop()
    type: Number;
}

export const realtimReportCountManagementSchema = SchemaFactory.createForClass(RealtimReportCountManagementSchema);



