import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type ManagerInboundRealtimeReportDocument = ManagerInboundRealtimeReportSchema & Document;

@Schema({ collection: "manager_inbound_realtime_count_mgmt", timestamps: true })

export class ManagerInboundRealtimeReportSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    lead_uuid: String;

    @Prop()
    tenant_uuid: String;

    @Prop()
    type: Number;
}

export const managerInboundRealtimeReportSchema = SchemaFactory.createForClass(ManagerInboundRealtimeReportSchema);




