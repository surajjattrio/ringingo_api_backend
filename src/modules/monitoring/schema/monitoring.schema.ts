import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type MonitoringDocument = MonitoringSchema & Document;

@Schema({ collection : "monitoring" , timestamps : true})

export class MonitoringSchema {

   // @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
   // uuid: String

    @Prop()
    extension : String

    @Prop()
    call_uuid : String

    @Prop()
    domain : String


    
}

export const monitoringSchema = SchemaFactory.createForClass(MonitoringSchema);

