import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type PresetDocument = PresetSchema & Document;

@Schema( { collection: "presets", timestamps: true, toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } } )

export class PresetSchema {

     @Prop( { type: String, default: function genUUID () { return randomUUID(); }, unique: true } )
     uuid: String

     @Prop()
     name: String

     @Prop()
     number: String

     @Prop()
     hide_number: String

     @Prop()
     campaign_uuid: String

     @Prop()
     tenant_uuid: String

}

export const presetSchema = SchemaFactory.createForClass( PresetSchema );




