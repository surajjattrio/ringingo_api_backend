import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type AdminIpMappingDocument = AdminIpMappingSchema & Document;

@Schema({ collection : "admin_ip_mapping" , timestamps : true})

export class AdminIpMappingSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    ip : String

    @Prop()
    prefix : String

    @Prop()
    status : String

}

export const adminipMappingSchema = SchemaFactory.createForClass(AdminIpMappingSchema);

