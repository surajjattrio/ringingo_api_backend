import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type ManagerOutboundRealtimeReportDocument = ManagerOutboundRealtimeReportSchema & Document;

@Schema({ collection: "manager_realtime_count_mgmt", timestamps: true })

export class ManagerOutboundRealtimeReportSchema {

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

export const managerOutboundRealtimeReportSchema = SchemaFactory.createForClass(ManagerOutboundRealtimeReportSchema);




