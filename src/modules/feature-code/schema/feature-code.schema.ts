import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type FeatureCodeDocument = FeatureCodeSchema & Document

@Schema({ collection : "feature_code" , timestamps : true})


export class FeatureCodeSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID();} })
    uuid: string

    @Prop()
    name : string

    @Prop()
    description : string

    @Prop()
    feature_code : string

    @Prop()
    display_name : string

    @Prop()
    tenant_uuid : string
}

export const featureCodeSchema = SchemaFactory.createForClass(FeatureCodeSchema); 
