import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type IdleStateAgentDocument = Document & IdleStateAgentSchema;

@Schema({ collection : "idle_state_agent_management" , timestamps : true })

export class IdleStateAgentSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    agent_uuid : String

    @Prop()
    status : String

    @Prop()
    tenant_uuid : String

    @Prop()
    campaign_uuid : String

    @Prop()
    date : String
}

export const idleStateAgentSchema = SchemaFactory.createForClass(IdleStateAgentSchema);

