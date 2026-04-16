import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsStrongPassword } from "class-validator";

export class ChangePasswordDto {
   
    @ApiProperty()
    @IsNotEmpty()
    current_password : string

    @ApiProperty()
    @IsNotEmpty()
    password : string

    @IsNotEmpty()
    tenant_uuid : string

    @IsOptional()
    role : string

    @IsOptional()
    uuid : string
}
