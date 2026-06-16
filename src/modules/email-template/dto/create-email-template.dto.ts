import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateEmailTemplateDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    subject: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    body: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    status: string;

    @IsString()
    @IsOptional()
    uuid: string;

    @IsString()
    @IsOptional()
    tenant_uuid: string;
}
