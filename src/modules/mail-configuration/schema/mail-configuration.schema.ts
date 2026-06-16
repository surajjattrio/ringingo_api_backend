import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { EmailTemplateSchema } from "../../email-template/schema/email-template.schema";

export type MailConfigurationDocument = MailConfigurationSchema & Document;

@Schema({
    collection: "mail_configuration",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

export class MailConfigurationSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID(); }, unique: true })
    uuid: String

    @Prop()
    name: String

    @Prop()
    host: String

    @Prop()
    username: String

    @Prop()
    password: String

    @Prop()
    port: String

    @Prop()
    from: String

    @Prop({ type: [String], default: [] })
    to: string[];

    @Prop()
    status: String

    @Prop({ type: [String], default: [] })
    template_ids: string[];

    @Prop()
    tenant_uuid: String
}

export const mailConfigurationSchema = SchemaFactory.createForClass(MailConfigurationSchema);

mailConfigurationSchema.virtual('templates', {
    ref: EmailTemplateSchema.name,
    localField: 'template_ids',
    foreignField: 'uuid',
});
