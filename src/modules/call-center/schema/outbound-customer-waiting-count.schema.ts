import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type OutboundCustomerWaitingDocument = OutboundCustomerWaitingSchema & Document;

@Schema({ collection : "outbound_customer_waiting_count" })

export class OutboundCustomerWaitingSchema {

    @Prop()
    count : Number

    @Prop()
    tenant_uuid : String
}

export const outboundCustomerWaitingSchema = SchemaFactory.createForClass(OutboundCustomerWaitingSchema);
