import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type MailConfigurationDocument = MailConfigurationSchema & Document;

@Schema({ collection : "mail_configuration" , timestamps : true })

export class MailConfigurationSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    host : String

    @Prop()
    username : String

    @Prop()
    password : String

    @Prop()
    port : String

    @Prop()
    from : String

    @Prop()
    status : String

    @Prop()
    tenant_uuid : String
}

export const mailConfigurationSchema = SchemaFactory.createForClass(MailConfigurationSchema);