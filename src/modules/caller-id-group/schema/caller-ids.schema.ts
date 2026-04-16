import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { randomUUID } from "crypto";

export type callerIdDocument = CallerIdSchema & Document;

@Schema({ collection : "caller_ids" , timestamps : true })

export class CallerIdSchema {
    
    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop({type: String})
    caller_id_group_uuid: String

    @Prop()
    caller_id : String
}

export const callerIdSchema = SchemaFactory.createForClass(CallerIdSchema);
