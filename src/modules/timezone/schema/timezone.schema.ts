import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
import { CountrySchema } from "src/modules/country/schema/country.schema";

export type TimezoneDocument = TimezoneSchema & Document;

@Schema({collection : "timezone" , timestamps : true , toJSON: { virtuals: true, getters: true }, toObject: { virtuals: true, getters: true }})

export class TimezoneSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID();} })
    uuid: string

    @Prop()
    gmttime : String;

    @Prop()
    gmtoffset : String;

    @Prop()
    timezone_name : String;

    @Prop()
    timezone_digit : string;

    @Prop()
    country_uuid : String;	
}

let timezoneSchema = SchemaFactory.createForClass(TimezoneSchema);
timezoneSchema.virtual('country' , {
    ref: CountrySchema.name,
    localField: 'country_uuid',
    foreignField: 'uuid',
})
export {timezoneSchema}



