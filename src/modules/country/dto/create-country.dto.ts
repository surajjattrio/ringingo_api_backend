import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDecimal, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsNumberString, IsString } from "class-validator";


export class CreateCountryDto {

    @ApiProperty()
    @IsNotEmpty()
    country : string

    @ApiProperty()
    @IsNotEmpty()
    nicename : string


    @ApiProperty({description : "The ISO country codes are internationally recognized codes that designate every country and most of the dependent areas a two-letter combination or a three-letter combination"})
    @IsNotEmpty()
    iso : string


    @ApiProperty({description : "ISO 3166-1 alpha-3 codes are three-letter country codes defined in ISO 3166-1, part of the ISO 3166 standard published by the International Organization for Standardization (ISO)"})
    @IsNotEmpty()
    iso3 : string


    @ApiProperty({description : "A country code is a short alphanumeric identification code for countries and dependent areas"})
    @IsNumberString()
    countrycode : number


    @ApiProperty({description : "Value-Added Tax (VAT) is a tax, which is payable on sales of goods or services within the territory of the Member States of the EU"})
    @IsNumber()
    @Type(() => Number)
    vat : number

    @ApiProperty({description : "Latitude is the measurement of distance north or south of the Equator"})
    @IsLatitude()
    latitude : string

    @ApiProperty({description : "Longitude is the measurement east or west of the prime meridian"})
    @IsLongitude()
    longitude : number

    @ApiProperty()
    @IsNotEmpty()
    capital : string
}
