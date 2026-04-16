import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { ArrayExpression, Document } from "mongoose";

export type OutgoingRulesDocument = OutgoingRulesSchema & Document;

@Schema({ collection : "outgoing_rules" , timestamps : true })

export class OutgoingRulesSchema {

    @Prop({type : String , default : function radomUUID(){ return randomUUID() } , unique : true})
    uuid : String

    @Prop()
    name : String

    @Prop({default : ""})
    description : String

    @Prop()
    status : String

    @Prop()
    tenant_uuid : String

    @Prop({type : Array})
    rules : ArrayExpression

    @Prop()
    created_flag : String
}

export const outgoingRulesSchema = SchemaFactory.createForClass(OutgoingRulesSchema);
