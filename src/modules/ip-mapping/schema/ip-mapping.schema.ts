import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type IpMappingDocument = IpMappingSchema & Document;

@Schema({ collection : "ip_mapping" , timestamps : true})

export class IpMappingSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    ip : String

    @Prop()
    prefix : String

    @Prop()
    tenant_uuid : String

    @Prop()
    status : String
}

export const ipMappingSchema = SchemaFactory.createForClass(IpMappingSchema);
