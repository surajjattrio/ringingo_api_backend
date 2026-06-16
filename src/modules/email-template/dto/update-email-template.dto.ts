import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateEmailTemplateDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    name: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
    subject: string;

    @ApiProperty()
    @IsString()
    @IsOptional()
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
