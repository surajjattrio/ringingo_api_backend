import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Date, Document } from "mongoose";

export type TelcomCircleDocument = TelecomCircleSchema & Document;

@Schema( { collection: "telecom_circle", timestamps: true } )

export class TelecomCircleSchema {

    @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
    uuid: String

    @Prop()
    prefix: String

    @Prop()
    name: String

    @Prop()
    tenant_uuid: String

    @Prop()
    status: String
}

export const telecomCircleSchema = SchemaFactory.createForClass( TelecomCircleSchema );

