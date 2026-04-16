import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf } from "class-validator";

export class CreateModechangeDto {

    @ApiProperty( { description: "0 - Active | 1 - Inactive", default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string

    @ApiProperty()
    @IsUUID()
    user_uuid: string

    @ApiProperty()
    @IsUUID()
    tenant_uuid: string

    // @IsOptional()
    // uuid: string
}
