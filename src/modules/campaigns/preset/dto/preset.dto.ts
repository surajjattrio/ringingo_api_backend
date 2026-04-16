import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, ValidateIf, IsOptional } from "class-validator";

export class PresetDto {

     @ApiProperty()
     @IsOptional()
     name: string


     @ApiProperty()
     @IsNumberString()
     number: string


     @ApiProperty()
     @IsNotEmpty()
     campaign_uuid: string


     @ApiProperty( { description: "0 - Yes | 1 - No", default: "0" } )
     @IsNumberString()
     @IsIn( [ "0", "1" ] )
     hide_number: string

     @ApiProperty()
     @IsUUID()
     tenant_uuid: string



}

