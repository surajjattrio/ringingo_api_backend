import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type callerIdGroupDocument = CallerIdGroupSchema & Document;

@Schema({ collection : "caller_id_group" , timestamps : true })

export class CallerIdGroupSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    tenant_uuid : String

    @Prop()
    status : String

    @Prop()
    caller_id_group: String

    @Prop()
    manager_uuid: string

    @Prop()
    role: string
}

export const callerIdGroupSchema = SchemaFactory.createForClass(CallerIdGroupSchema);
