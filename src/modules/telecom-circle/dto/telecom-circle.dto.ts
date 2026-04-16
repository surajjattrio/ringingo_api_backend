import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsMobilePhone, IsNotEmpty, IsNumberString, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class TelecomCircleDto {

    

    @ApiProperty()
    @IsNotEmpty()
    prefix: string

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @IsNotEmpty()
    tenant_uuid: string

    @ApiProperty( { default: 0 } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string

    
}


