import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type StateDocument = StateSchema & Document;

@Schema({ collection: "manage_states", timestamps: true })

export class StateSchema {

    @Prop({type : String , default : function radomUUID(){ return randomUUID() }})
    uuid : string

    @Prop()
    state_code: String

    @Prop()
    state_name: String

    @Prop()
    tenant_uuid: String

    @Prop()
    toggle_status: String
}

export const stateSchema = SchemaFactory.createForClass(StateSchema);