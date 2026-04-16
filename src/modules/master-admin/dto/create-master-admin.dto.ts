import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty , IsOptional } from 'class-validator';
export class LoginDto {

    @ApiProperty( { description: "Login with username / email" } )
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string

    @ApiProperty()
    @IsNotEmpty()
    tenant_domain: string

    @IsOptional()
    key : string

    @IsOptional()
    company_code: string
}
