import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type EmailTemplateDocument = EmailTemplateSchema & Document;

@Schema({ collection : "email_template" , timestamps : true })
export class EmailTemplateSchema {
    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    subject: string;

    @Prop({ required: true })
    body: string;

    @Prop({ default: "1" })
    status: string;

    @Prop({ required: true })
    tenant_uuid: string;
}

export const emailTemplateSchema = SchemaFactory.createForClass(EmailTemplateSchema);
