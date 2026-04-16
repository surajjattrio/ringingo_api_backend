import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf,MaxLength } from "class-validator";

export class CreateBreakcodeDto {

    @ApiProperty()
    @IsNotEmpty()
    @MaxLength(12, { message: 'Break Name cannot exceed 12 characters' })
    name: string

    @ApiProperty( { description: "0 - Active | 1 - Inactive", default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    status: string

    // @ApiProperty()
    // //  @ValidateIf(val => val.user_uuid != "")
    // @IsUUID()
    // user_uuid : string

    @ApiProperty()
    @IsUUID()
    tenant_uuid: string

    @IsOptional()
    uuid: string

    @ApiProperty()
    @IsOptional()
    description: string

    @ApiProperty()
    @IsNotEmpty()
    break_code: string

    @ApiProperty()
    @IsNotEmpty()
    duration: string

    @ApiProperty( { description: "0 - Active | 1 - Inactive", default: "0" } )
    @IsNumberString()
    @IsIn( [ "0", "1" ] )
    billable: string

    
}
