import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type WebHookDocument = WebHookSchema & Document;

@Schema({ collection : "web_hook" , timestamps : true})

export class WebHookSchema {

    @Prop({type : String , default : function radomUUID(){ return randomUUID() } , unique : true})
    uuid : String
    
    @Prop()
    status : String

    @Prop()
    web_hook_url : String

    @Prop()
    tenant_uuid : String

    @Prop()
    notify : String
}

export const webHookSchema = SchemaFactory.createForClass(WebHookSchema);
