import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";


export type LicenseDocument = LicenseSchema & Document;

@Schema( { collection: 'license', timestamps: true } )
export class LicenseSchema {

    @Prop()
    key_details: string

    @Prop()
    expiry: string

    @Prop()
    seats: Number
}

export const licenseSchema = SchemaFactory.createForClass( LicenseSchema );

