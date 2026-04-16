import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, IsStrongPassword } from "class-validator";

export class CreateManagerDto {

    @ApiProperty()
    @IsNotEmpty()
    first_name: string

    @ApiProperty()
    @IsOptional()
    last_name: string

    @ApiProperty()
    @IsNotEmpty()
    username: string

    @ApiProperty()
    @IsNotEmpty()
    email: string

    @ApiProperty({description : "Password should contains total 8 characters (one small letter , one capital letter , one special character, one numeric) Example : Test@123"})
    @IsStrongPassword()
    password : string

    @ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status: string

    @ApiProperty()
    @IsUUID()
    manager_role_uuid: string

    @ApiProperty()
    @IsUUID()
    extension_uuid: string

    @IsOptional()
    tenant_uuid : string
}
