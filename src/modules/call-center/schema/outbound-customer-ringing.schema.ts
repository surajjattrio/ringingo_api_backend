import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type OutboundCustomerRingingDocument = OutboundCustomerRingingSchema & Document;

@Schema({ collection : "outbound_customer_ringing" })

export class OutboundCustomerRingingSchema {

    @Prop()
    count : Number

    @Prop()
    tenant_uuid : String
}

export const outboundCustomerRingingSchema = SchemaFactory.createForClass(OutboundCustomerRingingSchema);
