import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type LeadBroadcastQueueDocument = LeadBroadcastQueueSchema & Document;

@Schema({collection : "lead_broadcast_queue" , timestamps : true})

export class LeadBroadcastQueueSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String
    
    @Prop()
    lead_management_uuid : String

    @Prop()
    lead_group_uuid : String

    @Prop()
    tenant_uuid : String

    @Prop()
    count : Number
}

export const leadBroadcastQueueSchema = SchemaFactory.createForClass(LeadBroadcastQueueSchema);