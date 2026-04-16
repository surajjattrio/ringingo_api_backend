import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsNotEmpty, IsNumberString, IsOptional, IsUUID, Length, ValidateIf } from "class-validator";

export class CreateStickyAgentDto {

    @ApiProperty()
    @IsUUID()
    user_role_uuid : string

    @ApiProperty()
    @IsNumberString()
    phone_number : string
    
    @ApiProperty()
    @IsOptional()
    user_uuid : string

    @ApiProperty()
    @IsOptional()
    tenant_uuid : string

    @ApiProperty()
    @IsOptional()
    sticky_user_role_status: string
}
