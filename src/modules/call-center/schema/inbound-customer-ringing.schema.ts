import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type InboundCustomerRingingDocument = InboundCustomerRingingSchema & Document;

@Schema({ collection : "inbound_customer_ringing" })

export class InboundCustomerRingingSchema {

    @Prop()
    count : Number

    @Prop()
    tenant_uuid : String
}

export const inboundCustomerRingingSchema = SchemaFactory.createForClass(InboundCustomerRingingSchema);
