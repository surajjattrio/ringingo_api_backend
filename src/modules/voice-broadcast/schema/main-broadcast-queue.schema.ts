import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";

export type MainBroadcastQueueDocument = MainBroadcastQueueSchema & Document;

@Schema({collection : "main_broadcast_queue" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class MainBroadcastQueueSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String
    
    @Prop()
    lead_management_uuid : String

    @Prop()
    lead_group_uuid : String

    @Prop()
    tenant_uuid : String
}

let mainBroadcastQueueSchema = SchemaFactory.createForClass(MainBroadcastQueueSchema);
mainBroadcastQueueSchema.virtual('lead_details' , {
    ref: LeadManagementSchema.name,
    localField: 'lead_management_uuid',
    foreignField: 'lead_management_uuid',
})
export { mainBroadcastQueueSchema }
