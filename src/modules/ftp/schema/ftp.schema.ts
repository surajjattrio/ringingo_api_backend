import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type FtpDocument = FtpSchema & Document;

@Schema({ collection : "ftpDetails" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true } })

export class FtpSchema {
    
    @Prop()
    host : String

    @Prop()
    port : Number

    @Prop()
    username : String

    @Prop()
    password : String

    @Prop()
    path : String

    @Prop()
    protocol : String

    @Prop()
    secure : String

    @Prop()
    delete_before_days_file : String

    @Prop()
    status : String

    @Prop()
    tenant_uuid : String
}

export const ftpSchema = SchemaFactory.createForClass(FtpSchema);



