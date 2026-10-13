import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type CtcCallDocument = CtcCallSchema & Document;

@Schema({ collection: "ctc_calls", timestamps: true })
export class CtcCallSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: string

    @Prop()
    tenant_uuid: string

    @Prop()
    agent_number: string

    @Prop()
    agent_type: string

    @Prop()
    agent_trunk: string

    @Prop()
    customer_number: string

    @Prop()
    customer_trunk: string

    @Prop()
    callfirst: string

    @Prop()
    timeout: number

    @Prop()
    record: boolean

    @Prop()
    recording_path: string

    @Prop()
    ok: boolean

    @Prop()
    message: string

    @Prop()
    job_uuid: string

    @Prop()
    command: string
}

let ctcCallSchema = SchemaFactory.createForClass(CtcCallSchema);

export { ctcCallSchema }
