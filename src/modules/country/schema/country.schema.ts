import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";

export type CountryDocument = CountrySchema & Document;

@Schema({ collection: "countries", timestamps: true })

export class CountrySchema {

    @Prop({type : String , default : function radomUUID(){ return randomUUID() }})
    uuid : string
    
    @Prop()
    country: String

    @Prop()
    nicename: String

    @Prop()
    iso: String

    @Prop()
    iso3: String

    @Prop()
    countrycode: String

    @Prop()
    vat: String

    @Prop()
    latitude: String

    @Prop()
    longitude: String

    @Prop()
    capital: String
}

export const countrySchema = SchemaFactory.createForClass(CountrySchema);