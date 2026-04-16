import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber , IsUUID } from "class-validator";


export class CreateTimezoneDto {

    @ApiProperty({default:"GMT+00:00" , description : "Greenwich Mean Time is the yearly average (or ‘mean’) of the time each day when the Sun crosses the Prime Meridian at the Royal Observatory Greenwich"})
    @IsNotEmpty()
    gmttime : string

    @ApiProperty({ description : "Example : +3600/-3600"})
    @IsNotEmpty()
    gmtoffset : string


    @ApiProperty({description  : "Example : Asia/Kolkata"})
    @IsNotEmpty()
    timezone_name : string

    @ApiProperty()
    @IsUUID()
    country_uuid : string

    @ApiProperty({default : 0 , description : "Example GMT +02:00 , digit will be 2"})
    @IsNumber()
    @Type(() => Number)
    timezone_digit : number
}
