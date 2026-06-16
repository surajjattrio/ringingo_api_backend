import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEmail, IsIn, IsNotEmpty, IsOptional, IsNumberString, IsPort, IsString, IsUUID } from "class-validator";

export class CreateMailConfigurationDto {

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    name: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    host: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    username: string

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    password: string

    @ApiProperty()
    @IsPort()
    port: string

    @ApiProperty()
    @IsNotEmpty()
    @IsEmail()
    from: string

    @ApiProperty({ type: [String], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    to: string[];


    /*@ApiProperty({description: '0 - Active | 1 - Inactive' , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status : string*/

    @ApiProperty({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    template_ids: string[];

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    tenant_uuid: string

    @ApiProperty()
    @IsOptional()
    @IsString()
    uuid: string;
}
