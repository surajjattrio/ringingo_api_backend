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

    // "prefix" (default, length/prefix/strip/prepend rows) | "cli" (route selected by caller id)
    @Prop({ default : "prefix" })
    route_type : String

    // CLI route, when no CLI is selected : "first" CLI of first route | "round_robin" over its CLIs
    @Prop({ default : "first" })
    no_cli_mode : String

    // Round robin counter for no_cli_mode = round_robin (updated by API & FreeSWITCH)
    @Prop({ default : 0 })
    cli_rr_counter : Number
}

export const outgoingRulesSchema = SchemaFactory.createForClass(OutgoingRulesSchema);
